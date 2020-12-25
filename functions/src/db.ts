import * as admin from "firebase-admin";

import { ICourse, IMark } from "./taParser";

admin.initializeApp({
  credential: admin.credential.cert("firebase-key.json"),
});
const db = admin.firestore();

export interface IUser {
  username: string;
  password: string;
  uid: string;
  devices: string[];
  courses: string[];
}

export interface ICourseStudent {
  markHashes: string[];
}

type DocumentRef = FirebaseFirestore.DocumentReference;
type Collection = FirebaseFirestore.CollectionReference;

type WriteResult = FirebaseFirestore.WriteResult;
export type MaybeWrite = WriteResult | undefined;

export const checkEvent = async (eventId: string): Promise<WriteResult> => {
  const matchingEvent = await db
    .collection("events")
    .where("id", "==", eventId)
    .limit(1)
    .get();

  if (!matchingEvent.empty) {
    throw new Error("pubsub event already processed!");
  }

  return db
    .collection("events")
    .doc()
    .set({ id: eventId });
};

export const getUsers = async (): Promise<FirebaseFirestore.QuerySnapshot> => {
  const users = await db.collection("users").get();

  if (users.empty) {
    throw new Error("no users found");
  }

  return users;
};

const setDifference = <K>(a: Set<K>, b: Set<K> | Map<K, unknown>): Set<K> => {
  const difference = new Set(a);
  for (const val of b.keys()) {
    difference.delete(val);
  }

  return difference;
};

const mapDifference = <K, V>(a: Map<K, V>, b: Set<K> | Map<K, V>): Map<K, V> => {
  const difference = new Map(a);
  for (const val of b.keys()) {
    difference.delete(val);
  }

  return difference;
};

const updateCourse = (
  courseRef: DocumentRef,
  course: ICourse,
): Promise<WriteResult> =>
  courseRef.set({
    date: course.date,
    hash: course.hash,
    name: course.name,
    weights: course.weights ?? [],
  });

const maybeUpdateCourse = async (
  courseRef: DocumentRef,
  course: ICourse,
): Promise<MaybeWrite> => {
  const courseDoc = await courseRef.get();
  if (courseDoc.exists) {
    // name+date define a course, so if those change we'll
    // just have a new course. this means only weights need to
    // be updated, so if we have no weights, there is no need
    // to update anything.
    if (course.weights === undefined) {
      return undefined;
    }

    const dbCourse = courseDoc.data() as ICourse;
    if (
      dbCourse.weights === undefined
      || dbCourse.weights.length !== course.weights.length
    ) {
      return updateCourse(courseRef, course);
    }

    for (let i = 0; i < course.weights.length; ++i) {
      if (dbCourse.weights[i] !== course.weights[i]) {
        return updateCourse(courseRef, course);
      }
    }

    return undefined;
  }

  if (course.weights === undefined) {
    // db course doesn't exist, but ta course has no weights,
    // so don't set the weights
    return courseRef.set({
      date: course.date,
      hash: course.hash,
      name: course.name,
    });
  }

  return updateCourse(courseRef, course);
};

const writeAll = (
  assessments: Collection,
  student: DocumentRef,
  course: ICourse,
): Array<Promise<WriteResult>> => {
  const writes: Array<Promise<WriteResult>> = [];
  const hashes: string[] = [];
  // if there are no assessments just write an empty array
  course.assessments?.forEach((mark): void => {
    hashes.push(mark.hash);
    writes.push(assessments.doc(mark.hash).set(mark));
  });
  writes.push(student.set({ markHashes: hashes }));

  return writes;
};

const writeDifference = (
  assessments: Collection,
  student: DocumentRef,
  dbHashes: Set<string>,
  courseAssessments: IMark[],
): Array<Promise<WriteResult>> => {
  const writes: Array<Promise<WriteResult>> = [];

  const taMap: Map<string, IMark> = new Map();
  for (const mark of courseAssessments) {
    taMap.set(mark.hash, mark);
  }

  // note: assessments that have updated marks are not considered updated
  // assessments but rather completely new ones
  const hashesToRemove = setDifference(dbHashes, taMap);
  const marksToAdd = mapDifference(taMap, dbHashes);

  if (hashesToRemove.size + marksToAdd.size > 0) {
    for (const hash of hashesToRemove) {
      writes.push(assessments.doc(hash).delete());
    }

    for (const [hash, mark] of marksToAdd) {
      writes.push(assessments.doc(hash).set(mark));
    }

    writes.push(student.set({ markHashes: [...taMap.keys()] }));
  }

  return writes;
};

export const writeToDb = async (
  user: IUser,
  courses: ICourse[],
): Promise<Array<Promise<MaybeWrite>>> => {
  const writes: Array<Promise<MaybeWrite>> = [];

  await Promise.all(courses.map(async (course): Promise<void> => {
    const courseRef = db.collection("courses").doc(course.hash);

    writes.push(maybeUpdateCourse(courseRef, course));

    const assessments = courseRef.collection("assessments");
    const student = courseRef.collection("students").doc(user.uid);

    const studentData = await student.get();

    if (!studentData.exists) {
      // case: db is completely empty
      // write everything, even if it's an empty array
      writes.concat(writeAll(assessments, student, course));

      return;
    }

    const dbHashes = new Set((studentData.data() as ICourseStudent).markHashes);

    if (course.assessments === undefined) {
      if (dbHashes.size > 0) {
        // case: db has data but ta gave nothing
        // clear all data
        for (const markToRemove of dbHashes) {
          writes.push(assessments.doc(markToRemove).delete());
        }

        writes.push(student.set({ markHashes: [] }));
      }
      // case: db has an empty array and ta gave nothing
      // do nothing

      return;
    }

    // case: db is not empty (has data/empty array) and ta gave some data
    writes.concat(writeDifference(assessments, student, dbHashes, course.assessments));
  }));

  return writes;
};
