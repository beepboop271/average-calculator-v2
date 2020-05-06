import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { request as httpsRequest } from "https";

admin.initializeApp({
  credential: admin.credential.cert("firebase-key.json"),
});
const db = admin.firestore();

// tslint:disable-next-line:no-any
const stringify = (x: any): string => JSON.stringify(x, undefined, 2);

interface IUser {
  username: string;
  password: string;
  uid: string;
  devices: string[];
  courses: string[];
}

type StrandString = "k" | "t" | "c" | "a" | "f";

interface IMark {
  weight: number;
  numerator: number;
  denominator: number;
}

interface IAssessment {
  name: string;
  uid: string;
  k: IMark | undefined;
  t: IMark | undefined;
  c: IMark | undefined;
  a: IMark | undefined;
  f: IMark | undefined;
}

interface ICourse {
  name: string;
  period: string;
  room: string;
  date: string;

  weights: number[] | undefined;
  assessments: IAssessment[] | undefined;
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

// const getDate = (): string => {
//   const now = new Date();

//   return now.getMonth() >= 1 && now.getMonth() < 8
//     ? `${now.getFullYear()}-02`
//     : `${now.getFullYear()}-09`;
// };

// const getFromFirestore = async (user: IUser): Promise<ICourse[]> => {
//   const coursesRef = db.collection("courses");
//   const date: string = getDate();

//   let snapshot: FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>;

//   const courseDocs = await Promise.all(
//     user.courses.map(async (courseName: string) => {
//       try {
//         snapshot = await coursesRef
//           .where("name", "==", courseName)
//           .where("date", "==", date)
//           .get();
//       } catch (e) {
//         console.error(
//           `Failed to retrieve course {name: ${courseName}, date: ${date}}:\n${e}`
//         );

//         return undefined;
//       }

//       if (snapshot.empty) {
//         console.error(
//           `Found no such course {name: ${courseName}, date: ${date}}`
//         );

//         return undefined;
//       }
//       if (snapshot.size > 1) {
//         console.error(
//           `Found more than one course {name: ${courseName}, date: ${date}}`
//         );

//         return undefined;
//       }

//       return snapshot.docs[0];
//     })
//   );

//   const courses: ICourse[] = [];
//   let maybeCourse: FirebaseFirestore.DocumentData;
//   let course: ICourse;

//   for (const courseDoc of courseDocs) {
//     if (courseDoc !== undefined) {
//       maybeCourse = courseDoc.data();

//       if (
//         maybeCourse.period === undefined ||
//         maybeCourse.room === undefined ||
//         maybeCourse.date === undefined ||
//         maybeCourse.name === undefined
//       ) {
//         // shouldn't even be possible to miss date or name but whatever
//         console.warn(
//           `Course missing info fields (expected name, period, room, date):\n${JSON.stringify(
//             maybeCourse
//           )}`
//         );
//       }

//       if (maybeCourse.weights === undefined) {
//         console.error(`Course missing weights:\n${JSON.stringify(maybeCourse)}`);
//       }

//       course = maybeCourse as ICourse;

//       snapshot = await courseDoc.ref
//         .collection("assessments")
//         .where("uid", "==", user.uid)
//         .orderBy("name", "asc")
//         .get();

//       if (snapshot.empty) {
//         console.log(`No assessments found:\n${JSON.stringify(course)}`);
//         course.assessments = [];
//       } else {
//         // snapshot.docs.forEach(doc => {console.log(doc.data())});
//         course.assessments = [];
//         for (const doc of snapshot.docs) {
//           // console.log(`pushed ${course.name} ${doc.data()}`);
//           course.assessments.push(doc.data() as IAssessment);
//         }
//         // console.log(course.assessments);
//       }

//       courses.push(course);
//     }
//   }

//   return courses;
// };

const getName = (report: string): string | undefined => {
  const match: RegExpExecArray | null = /<h2>(\S+?)<\/h2>/.exec(report);

  return match !== null ? match[1] : undefined;
};

const getWeights = (report: string): number[] | undefined => {
  const idx: number = report.indexOf("#ffffaa");
  if (idx === -1) {
    return undefined;
  }

  const weightTable: string[] = report.slice(idx, idx + 800).split("#");
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
  let match: RegExpMatchArray | null = report.match(beginningPattern);
  // console.log(match);
  if (match === null || match.index === undefined) {
    return undefined;
  }
  const idx: number = match.index;

  let tagsToClose = 1;
  const searcher: RegExp = new RegExp(searchPattern, "g");

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

const namePattern: RegExp = /<td rowspan="2">(.+?)<\/td>/;
const strandPatterns: Map<StrandString, RegExp> = new Map([
  ["k", /<td bgcolor="ffffaa" align="center" id="\S+?">([0-9\.]+) \/ ([0-9\.]+).+?<br> <font size="-2">weight=([0-9\.]+)<\/font> <\/td>/],
  ["t", /<td bgcolor="c0fea4" align="center" id="\S+?">([0-9\.]+) \/ ([0-9\.]+).+?<br> <font size="-2">weight=([0-9\.]+)<\/font> <\/td>/],
  ["c", /<td bgcolor="afafff" align="center" id="\S+?">([0-9\.]+) \/ ([0-9\.]+).+?<br> <font size="-2">weight=([0-9\.]+)<\/font> <\/td>/],
  ["a", /<td bgcolor="ffd490" align="center" id="\S+?">([0-9\.]+) \/ ([0-9\.]+).+?<br> <font size="-2">weight=([0-9\.]+)<\/font> <\/td>/],
  ["f", /<td bgcolor="#?dedede" align="center" id="\S+?">([0-9\.]+) \/ ([0-9\.]+).+?<br> <font size="-2">weight=([0-9\.]+)<\/font> <\/td>/],
]);
const tablePattern: RegExp = /<tr>.+<\/tr>/;

const getAssessments = (
  uid: string,
  report: string,
): IAssessment[] | undefined => {
  const assessmentTableMatch: ITagMatch | undefined = getEndTag(
    report,
    /table border="1" cellpadding="3" cellspacing="0" width="100%">/,
    /(<table)|(<\/table>)/,
    "<table",
  );
  if (assessmentTableMatch === undefined) {
    return undefined;
  }

  let assessmentTable = assessmentTableMatch.content.replace(
    /<tr> <td colspan="[0-5]" bgcolor="white"> [^&]*&nbsp; <\/td> <\/tr>/g,
    "",
  );

  let tableRow: ITagMatch | undefined;
  const rows: string[] = [];
  while (tablePattern.test(assessmentTable)) {
    tableRow = getEndTag(assessmentTable, /<tr>/, /(<tr>)|(<\/tr>)/, "<tr>");
    if (tableRow === undefined) {
      throw new Error(`Expected to find an assessment but none was found in:\n${report}`);
    }
    rows.push(tableRow.content);
    assessmentTable = tableRow.after;
  }
  rows.shift();

  const assessments: IAssessment[] = [];
  let match: RegExpExecArray | null;
  let assessment: IAssessment;
  let mark: IMark;

  for (const row of rows) {
    match = namePattern.exec(row);
    if (match === null) {
      throw new Error(`Could not find assessment name in row:\n${row}`);
    }
    assessment = {
      name: match[1].trim(),
      uid,
      k: undefined,
      t: undefined,
      c: undefined,
      a: undefined,
      f: undefined,
    };

    for (const [strand, pattern] of strandPatterns) {
      match = pattern.exec(row);
      if (match !== null) {
        mark = {
          weight: Number(match[3]),
          numerator: Number(match[1]),
          denominator: Number(match[2]),
        };
        assessment[strand] = mark;
      }
    }
    assessments.push(assessment);
  }

  return assessments;
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
      let token = "";
      if (
        res.headers !== undefined
        && res.headers.location !== undefined
        && res.headers["set-cookie"] !== undefined
      ) {
        for (const cookie of res.headers["set-cookie"]) {
          match = cookie.match(/^session_token=([^;]+);/);
          if (match !== null) {
            token = `session_token=${match[1]}`;
          }
        }
        if (token !== "") {
          resolve({
            cookie: token,
            homepage: res.headers.location,
          });
        } else {
          reject(new Error(`did not find the right cookies in: ${stringify(res.headers["set-cookie"])}`));
        }
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
          resolve(body);
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
    throw e;
  }

  console.log(`got report in ${Date.now() - startTime} ms`);

  reportPage = reportPage.replace(/\s+/g, " ");

  let name: string | undefined;
  let weights: number[] | undefined;
  let assessments: IAssessment[] | undefined;

  try {
    name = getName(reportPage);
    if (name === undefined) {
      throw new Error(`Course name not found:\n${reportPage}`);
    }

    weights = getWeights(reportPage);
    if (weights === undefined) {
      console.warn(`Course weights not found:\n${reportPage}`);
    }

    assessments = getAssessments(user.uid, reportPage);
    if (assessments === undefined) {
      console.warn(`Course assessments not found:\n${reportPage}\n`);
    }

    return {
      assessments,
      date: date[1],
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
    throw e;
  }
  console.log(`homepage retrieved in ${Date.now() - startTime} ms`);

  console.log("logged in");

  homePage = homePage.replace(/\s+/g, " ");

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

export const f = functions.https.onRequest(async (_request, response) => {
  const users = await db.collection("users").get();
  if (users.empty) {
    response.send("kms");

    return;
  }
  // let taCourses: ICourse[];
  // let dbCourses: ICourse[];
  // let courses: [ICourse[], ICourse[]];
  users.forEach(async (doc) => {
    if (doc.exists) {
      console.log(`retrieving user ${doc.data().username}`);

      // courses = await Promise.all([
      //   getFromTa(doc.data() as IUser),
      //   getFromFirestore(doc.data() as IUser),
      // ]);
      console.log(stringify(await getFromTa(doc.data() as IUser)));

      // console.log(`TA:\n${JSON.stringify(courses[0], undefined, 2)}`);
      // console.log("\n\n\n");
      // console.log(`DB:\n${JSON.stringify(courses[1], undefined, 2)}`);

      // compareAndWriteCourses(doc.data() as IUser, courses[0], courses[1]);
    }
  });

  response.send("Hello from Firebase!");
});
