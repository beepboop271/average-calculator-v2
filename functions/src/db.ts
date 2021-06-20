import { CourseChange, CourseStudentChange, isDelete } from "./compare";
import { admin } from "./firebase";
import { ICourse } from "./taParser";

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
type DocumentSnapshot = FirebaseFirestore.DocumentSnapshot;

export type WritePromise = Promise<FirebaseFirestore.WriteResult>;

export const checkEvent = async (eventId: string): WritePromise => {
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

export interface IFcmTokenResult {
  devices: string[];
  ref: DocumentRef;
}

export const getFcmTokens = async (uid: string): Promise<IFcmTokenResult> => {
  const user = await db
    .collection("users")
    .where("uid", "==", uid)
    .limit(1)
    .get();

  if (user.empty) {
    throw new Error("no such user");
  }

  return {
    devices: user.docs[0].get("devices") as string[],
    ref: user.docs[0].ref,
  };
};

export const writeFcmTokens = async (data: IFcmTokenResult): WritePromise =>
  data.ref.update({ devices: data.devices });

export const getUsers = async (): Promise<FirebaseFirestore.QuerySnapshot> => {
  const users = await db.collection("users").get();

  if (users.empty) {
    throw new Error("no users found");
  }

  return users;
};

export const getCourses = async (
  hashes: string[],
): Promise<DocumentSnapshot[]> =>
  Promise.all(hashes.map(
    async (hash): Promise<DocumentSnapshot> =>
      db.collection("courses").doc(hash).get(),
  ));

export const getStudentDocs = async (
  user: IUser,
  courses: DocumentSnapshot[],
): Promise<DocumentSnapshot[]> =>
  Promise.all(courses.map(
    async (doc): Promise<DocumentSnapshot> =>
      doc.ref.collection("students").doc(user.uid).get(),
  ));

export const handleCourseChange = async (
  change: CourseChange,
): WritePromise =>
  updateCourse(change.path, change.updated);

export const handleStudentChange = (
  change: CourseStudentChange,
): WritePromise[] => {
  const ops: WritePromise[] = [];

  ops.push(change.path.set(change.updated));

  for (const markChange of change.assessmentChanges) {
    if (isDelete(markChange)) {
      // don't delete the old mark (for reference)
      // ops.push(markChange.path.delete());
    } else {
      ops.push(markChange.path.set(markChange.updated));
    }
  }

  return ops;
};

const updateCourse = (
  courseRef: DocumentRef,
  course: ICourse,
): WritePromise =>
  courseRef.set({
    date: course.date,
    hash: course.hash,
    name: course.name,
    weights: course.weights ?? [],
  });
