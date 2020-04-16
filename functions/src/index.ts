import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import rp from "request-promise-native";
import { CookieJar } from "request";

admin.initializeApp({
  credential: admin.credential.cert("firebase-key.json")
});
const db = admin.firestore();

interface IUser {
  username: string;
  password: string;
  uid: string;
  devices: string[];
  courses: string[];
}

export const helloWorld = functions.https.onRequest(async (request, response) => {
  const users = await db.collection("users").get();
  if (users.empty) {
    response.send("kms");
    return;
  }
  let taCourses: ICourse[];
  let dbCourses: ICourse[];
  users.forEach(async doc => {
    if (doc.exists) {
      console.log(`retrieving user ${doc.data().username}`)
      console.log(`retrieving from ta`);
      // TODO: investigate marks not showing up
      taCourses = await getFromTa(<IUser>doc.data());
      console.log(JSON.stringify(taCourses, null, 2));
      console.log(`retrieving from firestore`);
      // TODO: assessment retrieving
      dbCourses = await getFromFirestore(<IUser>doc.data());
      console.log(JSON.stringify(dbCourses, null, 2));
    }
  });

  response.send("Hello from Firebase!");
});

type StrandString = "k"|"t"|"c"|"a"|"f";

interface IAuthMap {
  username: string;
  password: string;
}

interface ITagMatch {
  content: string;
  next: string;
}

interface IMark {
  weight: number;
  numerator: number;
  denominator: number;
}

interface IAssessment {
  name: string;
  marks: Map<StrandString, IMark|null>;
}

interface ICourse {
  name: string;
  period: string;
  room: string;
  date: string;

  weights: number[]|null;
  assessments: IAssessment[]|null;
}

function getDate(): string {
  const now = new Date();
  if (now.getMonth() >= 1 && now.getMonth() < 8) {
    // [Feb, Sep)
    return `Feb ${now.getFullYear()}`;
  } else {
    return `Sep ${now.getFullYear()}`;
  }
}

async function getFromFirestore(user: IUser): Promise<ICourse[]> {
  const coursesRef = db.collection("courses");
  const date: string = getDate();

  let snapshot: FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>;

  const courseDocs = await Promise.all(
    user.courses.map(async (courseName: string) => {
      try {
        snapshot = await coursesRef
          .where("name", "==", courseName)
          .where("date", "==", date)
          .get();
      } catch (e) {
        console.error(`Failed to retrieve course {name: ${courseName}, date: ${date}}:\n${e}`);
        return null;
      }

      if (snapshot.empty) {
        console.error(`Found no such course {name: ${courseName}, date: ${date}}`);
        return null;
      } else if (snapshot.size > 1) {
        console.error(`Found more than one course {name: ${courseName}, date: ${date}}`);
        return null;
      } else {
        return snapshot.docs[0];
      }
    })
  );

  const courses: ICourse[] = [];
  let course: ICourse;

  for (const courseDoc of courseDocs) {
    if (courseDoc !== null) {
      course = <ICourse>courseDoc.data();

      if (!course.period || !course.room || !course.date || !course.name) {
        // shouldn't even be possible to miss date or name but whatever
        console.warn(`Course missing info fields (expected name, period, room, date):\n${JSON.stringify(course)}`);
      }

      if (!course.weights) {
        console.error(`Course missing weights:\n${JSON.stringify(course)}`);
      }

      snapshot = await courseDoc.ref.collection("assessments").get();
      if (snapshot.empty) {
        console.log(`No assessments found:\n${JSON.stringify(course)}`);
        course.assessments = [];
      } else {
        console.log("not implemented lmao");
        course.assessments = [];
      }
    }
  }
  return courses;
}

async function getFromTa(auth: IAuthMap): Promise<ICourse[]> {
  console.log(`logging in as ${auth.username}...`);
  const session: CookieJar = rp.jar();

  let startTime = Date.now();
  let homePage: string;
  try {
    homePage = await rp.post({
      url: "https://ta.yrdsb.ca/yrdsb/index.php",
      jar: session,
      form: auth,
      followAllRedirects: true
      // timeout: 500
      // timeout: Number(process.env.TIMEOUT)
    });
  } catch (e) {
    throw e;
  }
  console.log(`homepage retrieved in ${Date.now()-startTime} ms`);

  const idMatcher: RegExp = /<a href="viewReport.php\?subject_id=([0-9]+)&student_id=([0-9]+)">/g;

  let courseIDs: RegExpMatchArray|null = idMatcher.exec(homePage);
  if (!courseIDs) {
    throw new Error(`No open reports found:\n${homePage}`);
  }

  console.log("logged in");
  const courses: ICourse[] = [];

  let report: string;
  let name: string|null;
  let weights: number[]|null;
  let assessments: IAssessment[]|null;

  while (courseIDs) {
    console.log(`getting ${courseIDs[1]}...`);

    startTime = Date.now();
    try {
      report = await rp.get({
        url: "https://ta.yrdsb.ca/live/students/viewReport.php",
        jar: session,
        qs: { subject_id: courseIDs[1], student_id: courseIDs[2] },
        followAllRedirects: false
        // timeout: 500
        // timeout: Number(process.env.TIMEOUT)
      });
    } catch (e) {
      throw e;
    }

    console.log(`got report in ${Date.now()-startTime} ms`);

    report = report.replace(/\s+/g, " ");

    try {
      name = getName(report);
      if (name === null)
        throw new Error(`Course name not found:\n${report}`);

      weights = getWeights(report);
      if (weights === null)
        console.warn(`Course weights not found:\n${report}`);

      assessments = getAssessments(report);
      if (assessments === null)
        console.warn(`Course assessments not found:\n${report}\n`);

      courses.push(<ICourse>{ name, weights, assessments });
    } catch (e) {
      // even if one course fails, we want to
      // continue grabbing the other courses
      console.warn(e);
    }
    courseIDs = idMatcher.exec(homePage);
  }
  return courses;
}

function getName(report: string): string|null {
  const match: RegExpExecArray|null = /<h2>(\S+?)<\/h2>/.exec(report);
  if (match) {
    return match[1];
  } else {
    return null;
  }
}

function getWeights(report: string): number[]|null {
  const idx: number = report.indexOf("#ffffaa");
  if (idx === -1) {
    return null;
  }

  const weightTable: string[] = report.slice(idx, idx+800).split("#");
  weightTable.shift();

  const weights: number[] = [];
  let match: RegExpMatchArray|null;

  for (let i: number = 0; i < 4; ++i) {
    match = weightTable[i].substring(weightTable[i].indexOf("%")).match(/([0-9\.]+)%/);
    if (match === null) {
      throw new Error(`Found weight table but couldn't find weight percentages in:\n${weightTable[i]}`);
    }
    weights.push(Number(match[1]));
  }

  match = weightTable[5]?.match(/([0-9\.]+)%/);
  if (match === null) {
    throw new Error(`Could not find final weight in:\n${weightTable}`);
  }
  weights.push(Number(match[1]));

  return weights;
}

function getAssessments(report: string): IAssessment[]|null {
  const assessmentTable: ITagMatch|null = getEndTag(
    report,
    /table border="1" cellpadding="3" cellspacing="0" width="100%">/,
    /(<table)|(<\/table>)/,
    "<table"
  );
  if (assessmentTable === null) {
    return null;
  }

  report = assessmentTable.content.replace(
    /<tr> <td colspan="[0-5]" bgcolor="white"> [^&]*&nbsp; <\/td> <\/tr>/g,
    ""
  );

  let tableRow: ITagMatch|null;
  const rows: string[] = [];
  const tablePattern: RegExp = /<tr>.+<\/tr>/;
  while (tablePattern.test(report)) {
    tableRow = getEndTag(report, /<tr>/, /(<tr>)|(<\/tr>)/, "<tr>");
    if (tableRow === null) {
      throw new Error(`Expected to find an assessment but none was found in:\n${report}`);
    }
    rows.push(tableRow.content);
    report = tableRow.next;
  }
  rows.shift();

  const assessments: IAssessment[] = [];

  const namePattern: RegExp = /<td rowspan="2">(.+?)<\/td>/;
  let name: string;
  let match: RegExpExecArray|null;
  let marks: Map<StrandString, IMark|null>;

  const strandPatterns: Map<StrandString, RegExp> = new Map([
    ["k", /<td bgcolor="ffffaa" align="center" id="\S+?">([0-9\.]+) \/ ([0-9\.]+).+?<br> <font size="-2">weight=([0-9\.]+)<\/font> <\/td>/],
    ["t", /<td bgcolor="c0fea4" align="center" id="\S+?">([0-9\.]+) \/ ([0-9\.]+).+?<br> <font size="-2">weight=([0-9\.]+)<\/font> <\/td>/],
    ["c", /<td bgcolor="afafff" align="center" id="\S+?">([0-9\.]+) \/ ([0-9\.]+).+?<br> <font size="-2">weight=([0-9\.]+)<\/font> <\/td>/],
    ["a", /<td bgcolor="ffd490" align="center" id="\S+?">([0-9\.]+) \/ ([0-9\.]+).+?<br> <font size="-2">weight=([0-9\.]+)<\/font> <\/td>/],
    ["f", /<td bgcolor="#?dedede" align="center" id="\S+?">([0-9\.]+) \/ ([0-9\.]+).+?<br> <font size="-2">weight=([0-9\.]+)<\/font> <\/td>/]
  ]);

  for (const row of rows) {
    marks = new Map<StrandString, IMark|null>();

    match = namePattern.exec(row);
    if (match === null) {
      throw new Error(`Could not find assessment name in row:\n${row}`);
    }
    name = match[1].trim();

    for (const [strand, pattern] of strandPatterns) {
      match = pattern.exec(row);
      if (match === null) {
        marks.set(strand, null);
      } else {
        marks.set(strand, <IMark>{
          numerator: Number(match[1]),
          denominator: Number(match[2]),
          weight: Number(match[3])
        });
      }
    }

    assessments.push(<IAssessment>{name: name, marks: marks});
  }
  return assessments;
}

function getEndTag(
  report: string,
  beginningPattern: RegExp,
  searchPattern: RegExp,
  startTag: string
): ITagMatch|null {
  let match: RegExpMatchArray|null = report.match(beginningPattern);
  if (match === null) {
    return null;
  }
  const idx: number = match.index!;

  let tagsToClose: number = 1;
  const searcher: RegExp = new RegExp(searchPattern, "g");

  while (tagsToClose > 0) {
    match = searcher.exec(report.substring(idx+1));
    if (match === null) {
      return null;
    }
    if (match[0] === startTag) {
      ++tagsToClose;
    } else {
      --tagsToClose;
    }
  }

  return {
    content: report.slice(idx-1, idx+match.index!+1+match[0].length),
    next: report.substring(idx+match.index!+1+match[0].length)
  };
}
