import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import rp from "request-promise-native";
import _ from 'lodash';
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

export const run = functions.https.onRequest(async (request, response) => {
  const users = await db.collection("users").get();
  if (users.empty) {
    response.send("kms");
    return;
  }
  let taCourses: ICourse[];
  
  users.forEach(async userDoc => {
    if (userDoc.exists && userDoc.data().username === '335432704') {
      try {
        console.log(`retrieving user ${userDoc.data().username}`)
        console.log(`retrieving from ta`);
        taCourses = await getFromTa(<IUser>userDoc.data());

        await updateFirestoreData(taCourses, userDoc.data().uid);
        // console.log(JSON.stringify(taCourses, null, 2));
        
      } catch (e) {
        console.log(e);
      }
    }
  });
  response.send("Hello from Firebase!");
});


export const sendNotification = functions.https.onRequest(async (req, res) => {

  const usersSnapshot = await db.collection('users').get();
  const dueDate = new Date('May 4, 2020 23:59:59');
  const now = new Date();
  const dueIn = (dueDate.getTime() - now.getTime())/1000;

  usersSnapshot.forEach(async userSnap => {
    try {
      const msg = {
        data: {
          hi: 'sdf',
          hello: 'hi'
        },
        token: userSnap.data().fcmToken,
        notification: {
          title: 'lickable flames',
          body: `conics is due in ${dueIn}seconds`,
        }
      };

      const msgRes = await admin.messaging().send(msg);
      console.log(msgRes);

    } catch (err) {
      console.log(err);
    }
    
  });
  res.send('yayyyy');
});


export const verifyUser = functions.https.onRequest(async (req, res) => {
  const user = req.body;
  if (user.password === '' || user.username === '') {
    res.json({error: 'invalid credentials'});
  } else {
    let taResponse: string;

    try {
      taResponse = await rp.post({
        url: "https://ta.yrdsb.ca/yrdsb/index.php",
        form: {
          username: user.username,
          password: user.password
        },
        followAllRedirects: true
      });
    } catch (err) {
      console.log(err);
    }
  
    if (/Invalid Login/.test(taResponse)) {
      res.json({error: 'invalid credentials'});
    } else {
      const token = await admin.auth().createCustomToken(user.uid);
      res.json({token: token});
    }
  }
});


interface IAuthMap {
  username: string;
  password: string;
}

interface ITagMatch {
  content: string;
  next: string;
}

interface IMark {
  numerator: number;
  denominator: number;
  weight: number;
}

interface IAssessment {
  name: string;
  marks: {[strand: string]: IMark|null};
}

interface ICourse {
  name: string;
  period: string;
  room: string;
  date: string;

  weights: {[strand: string]: number}|null;
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


async function updateFirestoreData(taCourses: ICourse[], userId: string) {
  return Promise.all(taCourses.map(async (course: ICourse) => {
    const coursesRef = db.collection('courses');
    const date = getDate();
    
    try {
      let docId: string;
      const courseSnapshot = await coursesRef
            .where('name', '==', course.name)
            .where('date', '==', date)
            .get();
      //if this course does not exist, first time set up add weightings
      if (courseSnapshot.empty) {
        docId = (await coursesRef.add({
          name: course.name,
          date: date,
          students: [],
          assessmentNames: [],
          weights: course.weights
        })).id;
      } else {
        docId = courseSnapshot.docs[0].id;
      }
      const courseRef = coursesRef.doc(docId);

      //who knows when this may be useful
      const students: string[] = (await courseRef.get())
                                .data().students;
      
      //add the student to the course
      if (!students.includes(userId)) {
        students.push(userId);
        courseRef.update({
          students: students
        }).catch(err => {
          console.log('Unable to update course with student');
          throw err;
        });
      }

      return Promise.all([
        updateAssessments(course, courseRef, userId)
      ]);
    } catch (e) {
      //I'll do something about this later
      throw e;
    }
    
  }));
}


//update/create the assessment to the database
async function updateAssessments(
  course: ICourse, 
  courseRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>, 
  userId: string
) {

  const assessmentsRef = courseRef.collection('assessments');

  const assessmentsSnapShot = await assessmentsRef
        .where('userId', '==', userId)
        .orderBy('order')
        .get();
  const taAssessments: [IAssessment, number][] = course.assessments.map((assessment, index) => {
    return [assessment, index];
  });
  
  //udpate order of assessments and delete assessments
  await Promise.all(assessmentsSnapShot.docs.map(async (assessmentDoc) => {
    //comparing the assessments by stringifying them
    const dbAssessment: IAssessment = {
      name: assessmentDoc.get('name'),
      marks: {
        k: assessmentDoc.get('k'),
        t: assessmentDoc.get('t'),
        c: assessmentDoc.get('c'),
        a: assessmentDoc.get('a'),
        f: assessmentDoc.get('f')
      }
    };

    const assessmentIdx = taAssessments.findIndex(assessmentStr => {
      return _.isEqual(assessmentStr[0], dbAssessment);
    });


    //if assessment exists in db but not ta
    if (assessmentIdx === -1) {
      console.log('deleted assessment');
      return assessmentsRef.doc(assessmentDoc.id).delete();
    }

    const order = taAssessments[assessmentIdx][1]; //the order of the assessment, for displaying reasons
    taAssessments.splice(assessmentIdx, 1); //delete the string so no duplicates

    //random assessment inserted in the middle of the table
    if (order !== assessmentDoc.get('order')) {
      return assessmentsRef.doc(assessmentDoc.id).update({order: order});
    }
    return Promise.resolve();
  }));

  // add the new documents/updating marks/weights
  return Promise.all(taAssessments.map(async(taAssessment: [IAssessment, number]) => {
    const assessment = taAssessment[0];
    console.log('new mark');
    sendMarkNotif(userId, course.name, assessment);
    return assessmentsRef.add({
      name: assessment.name,
      userId: userId,
      courseRef: courseRef,
      courseName: course.name,
      order: taAssessment[1],
      ...assessment.marks
    });
  }));
}


function sendMarkNotif(
  userId: string, 
  courseName: string,
  assessment: IAssessment
) {
  return new Promise(async(resolve, reject) => {
    const userSnapshot = await db.collection('users')
                                 .where('uid', '==', userId)
                                 .get();
    if (userSnapshot.size > 1) {
      reject('more than one user entry found');
    }
    if (userSnapshot.empty) {
      reject('no user entry is found');
    }

    let bodyText: string;
    let assessmentAvg = getAssessmentAvg(assessment.marks);
    const multiplyBy = Math.pow(100, userSnapshot.docs[0].data().precision);
    assessmentAvg = Math.round(assessmentAvg*100*multiplyBy)/multiplyBy;
    if (assessmentAvg) {
      bodyText = `${assessment.name}: ${assessmentAvg}%`;
    } else {
      bodyText = `${assessment.name}: null`;
    }

    resolve(admin.messaging().send({
      token: userSnapshot.docs[0].data().fcmToken,
      notification: {
        title: courseName,
        body: bodyText
      }
    }));
  });
}


function getAssessmentAvg(marks: {[strand: string]: IMark}) {
  let sum: number = 0;
  let totalWeight: number = 0;
  Object.values(marks).forEach(mark => {
    if (mark) {
      sum += mark.numerator/mark.denominator*mark.weight;
      totalWeight+=mark.weight;
    }
  });
  if (totalWeight === 0) {
    return null;
  }
  return sum/totalWeight;
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

  if (/Invalid Login/.test(homePage)) {
    throw new Error(`Invalid login: ${auth}`);
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
  let weights: {[strand: string]: number}|null;
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
      courses.push(<ICourse>{name, weights, assessments});
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

function getWeights(report: string): {[strand: string]: number}|null {
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

  const weightObj: {[strand: string]: number} = {
    k: weights[0],
    t: weights[1],
    c: weights[2],
    a: weights[3],
    f: weights[4]
  };
  return weightObj;
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

  //removing feedback
  // let table = assessmentTable.content.replace(
  //   /<tr> <td colspan="[0-5]" bgcolor="white"> [^&]*&nbsp; <\/td> <\/tr>/g,
  //   ""
  // );

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
  let marks: {[strand: string]: IMark|null};

  //typescript strict mode doesn't allow string indexing, have to add type that include index signature on it
  //type Dict = {[index: string]: string}

  const strandPatterns: {[strand: string]: RegExp} = {
    k: /<td bgcolor="ffffaa" align="center" id="\S+?">([0-9\.]+) \/ ([0-9\.]+).+?<br> <font size="-2">weight=([0-9\.]+)<\/font> <\/td>/,
    t: /<td bgcolor="c0fea4" align="center" id="\S+?">([0-9\.]+) \/ ([0-9\.]+).+?<br> <font size="-2">weight=([0-9\.]+)<\/font> <\/td>/,
    c: /<td bgcolor="afafff" align="center" id="\S+?">([0-9\.]+) \/ ([0-9\.]+).+?<br> <font size="-2">weight=([0-9\.]+)<\/font> <\/td>/,
    a: /<td bgcolor="ffd490" align="center" id="\S+?">([0-9\.]+) \/ ([0-9\.]+).+?<br> <font size="-2">weight=([0-9\.]+)<\/font> <\/td>/,
    f: /<td bgcolor="#?dedede" align="center" id="\S+?">([0-9\.]+) \/ ([0-9\.]+).+?<br> <font size="-2">weight=([0-9\.]+)<\/font> <\/td>/
  };

  for (const row of rows) {
    marks = {};

    match = namePattern.exec(row);
    if (match === null) {
      throw new Error(`Could not find assessment name in row:\n${row}`);
    }
    name = match[1].trim();

    for (const strand in strandPatterns) {
      match = strandPatterns[strand].exec(row);
      if (match === null) {
        marks[strand] = null;
      } else {
        marks[strand] = <IMark>{
          numerator: Number(match[1]),
          denominator: Number(match[2]),
          weight: Number(match[3])
        };
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