import * as crypto from "crypto";
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { request as httpsRequest } from "https";
import NestedError from "nested-error-stacks";

admin.initializeApp({
  credential: admin.credential.cert("firebase-key.json"),
});
const db = admin.firestore();

// tslint:disable-next-line:no-any no-unsafe-any
const stringify = (x: any): string => JSON.stringify(x, undefined, 2);

interface IUser {
  username: string;
  password: string;
  uid: string;
  devices: string[];
  courses: string[];
}

interface ICourseStudent {
  markHashes: string[];
}

type StrandString = "k" | "t" | "c" | "a" | "f";

interface IMark {
  strand: StrandString;
  uid: string;
  taId: string;
  name: string;
  hash: string;

  weight: number;
  numerator: number;
  denominator: number;
}

interface ICourse {
  name: string;
  period: string;
  room: string;
  date: string;
  hash: string;

  weights: number[] | undefined;
  assessments: IMark[] | undefined;
}

interface IResponse {
  headers?: {
    "set-cookie"?: string[];
    location?: string;
  };
  rawHeaders?: string[];
}

interface ILoginResult {
  cookie: string;
  homepage: string;
}

interface ITagMatch {
  after: string;
  content: string;
}

const getName = (report: string): string | undefined => {
  const match = report.match(/<h2>(\S+?)<\/h2>/);

  return match !== null ? match[1] : undefined;
};

const getWeights = (report: string): number[] | undefined => {
  const idx = report.indexOf("#ffffaa");
  if (idx === -1) {
    return undefined;
  }

  const weightTable = report.slice(idx, idx + 800).split("#");
  weightTable.shift();

  const weights: number[] = [];
  let match: RegExpMatchArray | null;

  for (let i = 0; i < 4; ++i) {
    match = weightTable[i]
      .substring(weightTable[i].indexOf("%"))
      .match(/([0-9\.]+)%/);
    if (match === null) {
      throw new Error(`Found weight table but couldn't find weight percentages in:\n${weightTable[i]}`);
    }
    weights.push(Number(match[1]));
  }

  match = weightTable[5]?.match(/([0-9\.]+)%/);
  if (match === null) {
    throw new Error(`Could not find final weight in:\n${weightTable.toString()}`);
  }
  weights.push(Number(match[1]));

  return weights;
};

const getEndTag = (
  report: string,
  beginningPattern: RegExp,
  searchPattern: RegExp,
  startTag: string,
): ITagMatch | undefined => {
  let match = report.match(beginningPattern);
  if (match === null || match.index === undefined) {
    return undefined;
  }
  const idx = match.index;

  let tagsToClose = 1;
  const searcher = new RegExp(searchPattern, "g");

  while (tagsToClose > 0) {
    match = searcher.exec(report.substring(idx + 1));
    if (match === null || match.index === undefined) {
      return undefined;
    }
    if (match[0] === startTag) {
      ++tagsToClose;
    } else {
      --tagsToClose;
    }
  }

  return {
    after: report.substring(idx + match.index + 1 + match[0].length),
    content: report.slice(idx - 1, idx + match.index + 1 + match[0].length),
  };
};

const getElementList = (
  report: string,
  beginningPattern: RegExp,
  searchPattern: RegExp,
  startTag: string,
  moreElementsTestPattern: RegExp,
): string[] => {
  const elements: string[] = [];
  let tagMatch: ITagMatch | undefined;
  let leftover = report;
  while (moreElementsTestPattern.test(leftover)) {
    tagMatch = getEndTag(leftover, beginningPattern, searchPattern, startTag);
    if (tagMatch === undefined) {
      throw new Error(`Expected to find more elements with ${moreElementsTestPattern.toString()} but none was found in:\n${report}`);
    }
    elements.push(tagMatch.content);
    leftover = tagMatch.after;
  }

  return elements;
};

const getCombinedHash = (...strings: string[]): string =>
  crypto
    .createHash("sha256")
    .update(strings.reduce((acc, cur): string => acc + cur, ""))
    .digest("base64")
    .replace(/=*$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

const namePattern = /<td rowspan="2">(.+?)<\/td>/;
const colourPattern = /<td bgcolor="([#0-9a-f]+)"/;
const markPattern = /align="center" id="e,(?<id>\d+)">(?:no mark|(?<numerator>\d+(?:\.\d+)?)? \/ (?<denominator>\d+(?:\.\d+)?)[^<]+<br> <font size="-2">weight=(?<weight>\d+(?:\.\d+)?)<\/font>)/;
const strandsFromColour: Map<string, StrandString> = new Map([
  ["ffffaa", "k"],
  ["c0fea4", "t"],
  ["afafff", "c"],
  ["ffd490", "a"],
  ["#dedede", "f"],
]);
const tableRowPattern = /<tr>.+<\/tr>/;
const tableDataPattern = /<td.+<\/td>/;

const getMarksFromRow = (
  uid: string,
  tableRow: string,
): IMark[] => {
  const parts = getElementList(
    tableRow,
    /<td/,
    /(<td)|(<\/td>)/,
    "<td",
    tableDataPattern,
  );

  if (parts.length === 0) {
    throw new Error(`Found no data in row:\n${tableRow}`);
  }
  const nameMatch = parts.shift()?.match(namePattern);
  if (nameMatch === null || nameMatch === undefined) {
    throw new Error(`Could not find assessment name in row:\n${tableRow}`);
  }
  const rowName = nameMatch[1].trim();

  const marks: IMark[] = [];

  let colourMatch: RegExpMatchArray | null;
  let strand: StrandString | undefined;
  let markMatch: RegExpMatchArray | null;
  for (const part of parts) {
    colourMatch = part.match(colourPattern);
    if (colourMatch === null) {
      throw new Error(`Found no strand colour in part:\n${part}\nin row:\n${tableRow}`);
    }
    strand = strandsFromColour.get(colourMatch[1]);
    if (strand === undefined) {
      throw new Error(`Found no matching strand for colour ${colourMatch[1]} in row:\n${tableRow}`);
    }

    markMatch = part.match(markPattern);
    if (markMatch !== null && markMatch.groups !== undefined) {
      marks.push({
        strand,
        uid,
        taId: markMatch.groups.id,
        name: rowName,
        hash: getCombinedHash(
          uid,
          markMatch.groups.id,
          markMatch.groups.weight,
          markMatch.groups.numerator,
          markMatch.groups.denominator,
        ),

        weight: Number(markMatch.groups.weight),
        numerator: Number(markMatch.groups.numerator),
        denominator: Number(markMatch.groups.denominator),
      });
    }
  }

  return marks;
};

const getMarksFromReport = (
  uid: string,
  report: string,
): IMark[] | undefined => {
  const assessmentTableMatch = getEndTag(
    report,
    /table border="1" cellpadding="3" cellspacing="0" width="100%">/,
    /(<table)|(<\/table>)/,
    "<table",
  );
  if (assessmentTableMatch === undefined) {
    return undefined;
  }

  const rows = getElementList(
    assessmentTableMatch.content.replace(
      /<tr> <td colspan="[0-5]" bgcolor="white"> [^&]*&nbsp; <\/td> <\/tr>/g,
      "",
    ),
    /<tr>/,
    /(<tr>)|(<\/tr>)/,
    "<tr>",
    tableRowPattern,
  );
  rows.shift();

  const marks: IMark[] = [];

  for (const row of rows) {
    marks.push(...getMarksFromRow(uid, row));
  }

  return marks;
};

const loginOptions = {
  headers: {
    "Content-Length": "36",
    "Content-Type": "application/x-www-form-urlencoded",
  },
  hostname: "ta.yrdsb.ca",
  method: "POST",
  path: "/live/index.php",
};

const postToLogin = async (user: IUser): Promise<ILoginResult> =>
  new Promise((resolve, reject): void => {
    const req = httpsRequest(loginOptions);
    req.on("error", (err) => { reject(err); });
    req.on("response", (res: IResponse) => {
      let match: RegExpMatchArray | null;
      if (
        res.headers !== undefined
        && res.headers.location !== undefined
        && res.headers["set-cookie"] !== undefined
      ) {
        for (const cookie of res.headers["set-cookie"]) {
          match = cookie.match(/^session_token=([^;]+);/);
          if (match !== null && match[1] !== "deleted") {
            resolve({
              cookie: `session_token=${match[1]}`,
              homepage: res.headers.location,
            });
          }
        }
        reject(new Error(`did not find the right cookies in: ${stringify(res.headers["set-cookie"])}`));
      } else {
        reject(new Error(`found no headers or cookies when logging in: ${stringify(res)}`));
      }
    });
    req.write(`username=${user.username}&password=${user.password}`);
    req.end();
  });

const getPage = async (
  hostname: string,
  path: string,
  cookie: string,
): Promise<string> =>
  new Promise((resolve, reject): void => {
    let body = "";
    const req = httpsRequest(
      {
        headers: { Cookie: cookie },
        hostname,
        method: "GET",
        path,
      },
      (res) => {
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => {
          // replace all whitespace with a single space
          resolve(body.replace(/ {2,}|[\r\n\t\f\v]+/g, " "));
        });
      },
    );
    req.on("error", (err) => {
      reject(err);
    });
    req.end();
  });

const idMatcher = /<a href="viewReport.php\?subject_id=([0-9]+)&student_id=([0-9]+)">/;
const periodMatcher = /Block: ([A-Z]|ASP|\d)/;
const dateMatcher = /(\d\d\d\d-\d\d)-\d\d/;
const roomMatcher = /rm\. (\d+|PB\d+)/;

const getCourse = async (
  homepageRow: string,
  cookie: string,
  user: IUser,
): Promise<ICourse> => {
  const id = homepageRow.match(idMatcher);
  const period = homepageRow.match(periodMatcher);
  const date = homepageRow.match(dateMatcher);
  const room = homepageRow.match(roomMatcher);
  if (date === null) {
    throw new Error(`empty homepage row: ${homepageRow}`);
  }
  if (id === null) {
    throw new Error(`course closed: ${homepageRow}`);
  }
  if (period === null || room === null) {
    throw new Error(`no period/room found in homepage row: ${homepageRow}`);
  }

  const startTime = Date.now();
  let reportPage: string;
  try {
    reportPage = await getPage(
      "ta.yrdsb.ca",
      `/live/students/viewReport.php?subject_id=${id[1]}&student_id=${id[2]}`,
      cookie,
    );
  } catch (e) {
    if (e instanceof Error) {
      throw new NestedError(`Failed to load report for course ${id[1]}`, e);
    }
    throw new Error(`Failed to load report for course ${id[1]}: ${e}`);
  }

  console.log(`got report ${id[1]} in ${Date.now() - startTime} ms`);

  let name: string | undefined;
  let weights: number[] | undefined;
  let assessments: IMark[] | undefined;

  try {
    name = getName(reportPage);
    if (name === undefined) {
      throw new Error(`Course name not found:\n${reportPage}`);
    }

    weights = getWeights(reportPage);
    if (weights === undefined) {
      console.warn(`Course weights not found:\n${reportPage}`);
    }

    assessments = getMarksFromReport(user.uid, reportPage);
    if (assessments === undefined) {
      console.warn(`Course assessments not found:\n${reportPage}`);
    }

    return {
      assessments,
      date: date[1],
      hash: getCombinedHash(name, date[1]),
      name,
      period: period[1],
      room: room[1],
      weights,
    };
  } catch (e) {
    throw e;
  }
};

const getFromTa = async (user: IUser): Promise<ICourse[]> => {
  console.log(`logging in as ${user.username}...`);

  const startTime = Date.now();
  let homePage: string;
  let res: ILoginResult;
  try {
    if (user.username.length + user.password.length !== 17) {
      throw new Error(`invalid credentials: ${user.username} ${user.password}`);
    }
    res = await postToLogin(user);
    homePage = await getPage(
      "ta.yrdsb.ca",
      res.homepage.split(".ca", 2)[1],
      res.cookie,
    );
  } catch (e) {
    if (e instanceof Error) {
      throw new NestedError(`Failed to load homepage for user ${user.username}`, e);
    }
    throw new Error(`Failed to load homepage for user ${user.username}: ${e}`);
  }
  console.log(`homepage retrieved in ${Date.now() - startTime} ms`);
  console.log("logged in");

  let courseRows = getEndTag(
    homePage,
    /<tr bgcolor="#(?:dd|ee)ffff">/,
    /(<tr)|(<\/tr>)/,
    "<tr",
  );
  if (courseRows === undefined) {
    throw new Error(`No open reports found:\n${homePage}`);
  }

  const courses: ICourse[] = [];

  while (courseRows !== undefined) {
    try {
      courses.push(await getCourse(courseRows.content, res.cookie, user));
    } catch (e) {
      console.warn(e);
    }

    courseRows = getEndTag(
      courseRows.after,
      /<tr bgcolor="#(?:dd|ee)ffff">/,
      /(<tr)|(<\/tr>)/,
      "<tr",
    );
  }

  return courses;
};

type PendingWrites = Array<Promise<FirebaseFirestore.WriteResult>>;

const setDifference = <T>(a: Set<T>, b: Set<T>): Set<T> => {
  const difference = new Set(a);
  for (const val of b) {
    difference.delete(val);
  }

  return difference;
}

const writeToDb = (
  user: IUser,
  courses: ICourse[],
): PendingWrites => {
  const pendingWrites: PendingWrites = [];

  courses.forEach(async (course): Promise<void> => {
    const writeOps: PendingWrites = [];

    const assessmentsRef = db.collection("courses")
      .doc(course.hash)
      .collection("assessments");
    const studentDataRef = db.collection("courses")
      .doc(course.hash)
      .collection("students")
      .doc(user.uid);

    const studentData = await studentDataRef.get();

    if (studentData.exists) {
      const dbHashSet = new Set((studentData.data() as ICourseStudent).markHashes);
      const freshHashes: string[] = course.assessments === undefined
        ? []
        : course.assessments.map((mark): string => mark.hash);

      const freshHashSet = new Set(course.assessments?.map((mark): string => mark.hash));

      const markHashesToRemove = setDifference(dbHashSet, freshHashSet);
      const markHashesToAdd = setDifference(freshHashSet, dbHashSet);
      const marksToAdd: IMark[] = course.assessments === undefined
        ? []
        : course.assessments.filter((mark): boolean => markHashesToAdd.has(mark.hash));

      if (markHashesToRemove.size + marksToAdd.length > 0) {
        for (const markToRemove of markHashesToRemove) {
          writeOps.push(assessmentsRef.doc(markToRemove).delete());
        }

        for (const markToAdd of marksToAdd) {
          writeOps.push(assessmentsRef.doc(markToAdd.hash).set(markToAdd));
        }

        writeOps.push(studentDataRef.set({
          markHashes: freshHashes,
        }));
      }
    } else {
      const writtenHashes: string[] = [];
      course.assessments?.forEach((mark): void => {
        writtenHashes.push(mark.hash);
        writeOps.push(assessmentsRef.doc(mark.hash).set(mark));
      });
      writeOps.push(studentDataRef.set({
        markHashes: writtenHashes,
      }));
    }

    pendingWrites.concat(writeOps);
  });

  return pendingWrites;
};

export const f = functions.https.onRequest(async (_request, response) => {
  try {
    const users = await db.collection("users").get();

    if (users.empty) {
      response.send("kms");

      return;
    }

    let courses: ICourse[];

    users.forEach(async (doc) => {
      if (doc.exists) {
        console.log(`retrieving user ${doc.data().username}`);
        // synchronously because we need to be nice to teachassist
        try {
          courses = await getFromTa(doc.data() as IUser);
        } catch (e) {
          if (e instanceof Error) {
            throw new NestedError("Failed to retrieve data from teachassist", e);
          }
          throw new Error(`Failed to retrieve data from teachassist: ${e}`);
        }
        // console.log(stringify(courses));
        Promise.all(writeToDb(doc.data() as IUser, courses))
          .then(() => { console.log(`successfully wrote courses from ${doc.data().username}`); })
          .catch(console.error);
        await new Promise((resolve): void => { setTimeout(resolve, 1000); });
      }
    });

    response.send("Hello from Firebase!");
  } catch (e) {
    if (e instanceof Error) {
      throw new NestedError("Failed to retrieve users", e);
    }
    throw new Error(`Failed to retrieve users: ${e}`);
  }
});
