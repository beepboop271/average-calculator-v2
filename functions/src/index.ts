import { https, pubsub } from "firebase-functions";
import NestedError from "nested-error-stacks";

import {
  compareCourse,
  compareCourseStudent,
  CourseChange,
  CourseStudentChange,
  studentChangeToString,
} from "./compare";
import {
  checkEvent,
  getCourses,
  getFcmTokens,
  getStudentDocs,
  getUsers,
  handleCourseChange,
  handleStudentChange,
  User,
  writeFcmTokens,
  WritePromise,
} from "./db";
import { buildMessage, sendMessage } from "./notifications";
import { getFromTa } from "./taFetcher";
import { calculateCourseMark, Course } from "./taParser";

interface UserData {
  course: Course;
  courseChange?: CourseChange;
  studentChange?: CourseStudentChange;
}

const fetchUserData = async (user: User): Promise<UserData[]> => {
  const taCourses = await getFromTa(user);
  const dbCourses = await getCourses(
    taCourses.map((course): string => course.hash),
  );
  const dbStudentDocs = await getStudentDocs(user, dbCourses);

  return taCourses.map((course, i): UserData => ({
    course,
    courseChange: compareCourse(course, dbCourses[i]),
    studentChange: compareCourseStudent(
      course, dbCourses[i], dbStudentDocs[i],
    ),
  }));
};

const processUser = async (
  doc: FirebaseFirestore.QueryDocumentSnapshot,
): Promise<WritePromise[]> => {
  const user: User = doc.data() as User;
  if (doc.exists) {
    console.log(`retrieving user ${user.username}`);

    const ops: Array<WritePromise | WritePromise[]> = [];

    for (const { course, courseChange, studentChange } of await fetchUserData(user)) {
      const avg = calculateCourseMark(course);

      if (courseChange !== undefined) {
        const tokens = await sendMessage(buildMessage(
          user,
          `${course.name} Weights (${avg.average})`,
          `${course.weights?.toString()}`,
        ));
        if (tokens.length !== user.devices.length) {
          ops.push(writeFcmTokens({ devices: tokens, ref: doc.ref }));
        }
        ops.push(handleCourseChange(courseChange));
      }

      if (studentChange !== undefined) {
        const tokens = await sendMessage(buildMessage(
          user,
          `${course.name} (${avg.average})`,
          `${avg.strands.toString()}\n${studentChangeToString(studentChange)}`,
        ));
        if (tokens.length !== user.devices.length) {
          ops.push(writeFcmTokens({ devices: tokens, ref: doc.ref }));
        }
        ops.push(handleStudentChange(studentChange));
      }
    }

    return ops.flat();
  }
  throw new Error(`User document does not exist: ${doc.ref.path}`);
};

// 0 * * 1-6,9-12 0,6
// 0 0-8,16-23 * 1-6,9-12 1-5
// 0,20,40 9-15 * 1-6,9-12 1-5
export const fun = pubsub
  .topic("poll-ta")
  .onPublish(async (_msg, ctx): Promise<unknown> => {
    // idempotency check
    try {
      // either you await here so you can try/catch and rethrow
      // the error to end execution, or you don't await to
      // prevent wasted time but could end up killing the
      // process at a random time
      await checkEvent(ctx.eventId);
    } catch (err) {
      if (err instanceof Error) {
        throw new NestedError("Failed in event check", err);
      }
      throw new Error(`Failed in event check: ${err}`);
    }

    let users: FirebaseFirestore.QuerySnapshot;
    try {
      users = await getUsers();
    } catch (e) {
      if (e instanceof Error) {
        throw new NestedError("Failed to retrieve users", e);
      }
      throw new Error(`Failed to retrieve users: ${e}`);
    }

    return Promise.all(users.docs.flatMap(processUser)).catch(console.error);
  });

export const addFcmToken = https.onCall(
  async (data: { token?: unknown }, ctx): WritePromise => {
    if (ctx.auth?.uid === undefined) {
      throw new https.HttpsError("unauthenticated", "No UID found");
    }

    if (data.token === undefined || typeof data.token !== "string") {
      throw new https.HttpsError("invalid-argument", "invalid token");
    }

    const { devices, ref } = await getFcmTokens(ctx.auth.uid);
    devices.push(data.token);

    const verifiedDevices = await sendMessage({ tokens: devices }, true);

    return writeFcmTokens({ devices: verifiedDevices, ref });
  },
);
