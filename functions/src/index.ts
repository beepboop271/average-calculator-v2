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

export const run = functions.https.onRequest(async (request, response) => {
  const users = await db.collection("users").get();
  if (users.empty) {
    response.send("kms");
    return;
  }
  let taCourses: ICourse[];
  
  users.forEach(async userDoc => {
    if (userDoc.exists) {
      try {
        console.log(`retrieving user ${userDoc.data().username}`)
        console.log(`retrieving from ta`);
        taCourses = await getFromTa(<IUser>userDoc.data());

        await updateFirestoreData(taCourses, userDoc.data().uid);
        console.log(JSON.stringify(taCourses, null, 2));
        
      } catch (e) {
        console.log(e);
      }
    }
  });
  response.send("Hello from Firebase!");
});


export const onMarkUpdate = functions.firestore
      .document('courses/{course}/assessments/{assessment}')
      .onWrite((change, context) => {
  const oldAssessment: FirebaseFirestore.DocumentData = change.before.data();
  const assessment: FirebaseFirestore.DocumentData = change.after.data();

  if (!change.before.exists) {
    console.log(`new mark: ${assessment.courseName}`);
    console.log(`assessment: ${assessment.name}`);
    console.log(`user: ${assessment.userId}`);
    console.log(assessment);
  } else if (!change.after.exists) {
    console.log(`assessment deleted: ${oldAssessment.name}`);
    console.log(`user: ${oldAssessment.userId}`);
    console.log(oldAssessment);
  } else if (oldAssessment !== assessment) {
    console.log(`updated mark: ${assessment.courseName}`);
    console.log(`assessment: ${assessment.name}`);
    console.log(`user: ${assessment.userId}`);
    console.log(oldAssessment);
    console.log(assessment);
  } else {
    console.log('no change');
  }

  return Promise.resolve();
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
        deleteRemovedAssessments(course, courseRef),
        updateAssessments(course, courseRef, userId)
      ]);
    } catch (e) {
      //I'll do something about this later
      throw e;
    }
    
  }));
}

//in case a teacher deletes an assessment from ta
async function deleteRemovedAssessments(
  course: ICourse, 
  courseRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>, 
) {
  const firestoreAssessmentNames: string[] = (await courseRef.get())
                                              .data().assessmentNames;
  const assessmentNames: string[] = [];
  course.assessments.forEach(assessment => {
    assessmentNames.push(assessment.name);
  });
  const removedAssessments = firestoreAssessmentNames.filter((name: string) => {
    return !assessmentNames.includes(name);
  })

  //if there aren't any removed assessments
  if (removedAssessments.length == 0) {
    return courseRef.update({assessmentNames: assessmentNames});
  }

  const assessmentsRef = courseRef.collection('assessments');
  const removedAssessmentsSnapshot = await assessmentsRef
                                      .where('name', 'in', removedAssessments)
                                      .get();

  //this shouldn't happen unless something really wrong happens
  let deletePromise: Promise<FirebaseFirestore.WriteResult[]>;
  if (removedAssessmentsSnapshot.empty) {
    console.warn('Unable to find removed assessments');
  } else {
    deletePromise = Promise.all(removedAssessmentsSnapshot.docs.map(snap => {
      return assessmentsRef.doc(snap.id).delete();
    }));
  }
  const updatePromise: Promise<FirebaseFirestore.WriteResult>
        = courseRef.update({assessmentNames: assessmentNames});
  return Promise.all([deletePromise, updatePromise]);
}


//update/create the assessment to the database
async function updateAssessments(
  course: ICourse, 
  courseRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>, 
  userId: string
) {
  const assessmentsRef = courseRef.collection('assessments');

  return Promise.all(course.assessments.map(async (assessment: IAssessment) => {
    const assessmentSnapshot = await assessmentsRef
          .where('userId', '==', userId)
          .where('name', '==', assessment.name)
          .get();
    //add doc if its a new doc
    if (assessmentSnapshot.empty) {
      return assessmentsRef.add({
        name: assessment.name,
        userId: userId,
        courseRef: courseRef,
        courseName: course.name,
        updatedTime: admin.firestore.FieldValue.serverTimestamp(),
        ...assessment.marks
      });
    }
    //update marks if doc exists
    return assessmentsRef.doc(assessmentSnapshot.docs[0].id).update(assessment.marks);
  }));
}


// async function getFromFirestore(user: IUser): Promise<ICourse[]> {
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
//         console.error(`Failed to retrieve course {name: ${courseName}, date: ${date}}:\n${e}`);
//         return null;
//       }

//       if (snapshot.empty) {
//         console.error(`Found no such course {name: ${courseName}, date: ${date}}`);
//         return null;
//       } else if (snapshot.size > 1) {
//         console.error(`Found more than one course {name: ${courseName}, date: ${date}}`);
//         return null;
//       } else {
//         return snapshot.docs[0];
//       }
//     })
//   );

//   const courses: ICourse[] = [];
//   let course: ICourse;

//   for (const courseDoc of courseDocs) {
//     if (courseDoc !== null) {
//       course = <ICourse>courseDoc.data();

//       if (!course.period || !course.room || !course.date || !course.name) {
//         // shouldn't even be possible to miss date or name but whatever
//         console.warn(`Course missing info fields (expected name, period, room, date):\n${JSON.stringify(course)}`);
//       }

//       if (!course.weights) {
//         console.error(`Course missing weights:\n${JSON.stringify(course)}`);
//       }

//       snapshot = await courseDoc.ref.collection("assessments").get();
//       if (snapshot.empty) {
//         console.log(`No assessments found:\n${JSON.stringify(course)}`);
//         course.assessments = [];
//       } else {
//         console.log("not implemented lmao");
//         course.assessments = [];
//       }
//     }
//   }
//   return courses;
// }


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