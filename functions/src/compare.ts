import type { CourseStudent } from "./db";
import type { Course, Mark } from "./taParser";

interface ChangeBase {
  path: FirebaseFirestore.DocumentReference;
  exists: boolean;
}

interface DeleteChange extends ChangeBase {
  updated: undefined;
  exists: true;
}

interface CreateChange<T> extends ChangeBase {
  updated: T;
  exists: false;
}

interface UpdateChange<T> extends ChangeBase {
  updated: T;
  exists: true;
}

type AdditiveChange<T> = UpdateChange<T> | CreateChange<T>;

type Change<T> = AdditiveChange<T> | DeleteChange;

export const isDelete = <T>(
  change: Change<T>,
): change is DeleteChange =>
  (change as UpdateChange<T>).updated === undefined;

export const isCreate = <T>(
  change: Change<T>,
): change is CreateChange<T> => {
  const update: CreateChange<T> = change as CreateChange<T>;

  return update.updated !== undefined && !update.exists;
};

export const isUpdate = <T>(
  change: Change<T>,
): change is UpdateChange<T> => {
  const update: UpdateChange<T> = change as UpdateChange<T>;

  return update.updated !== undefined && update.exists;
};

export type CourseChange = AdditiveChange<Course>;

export type MarkChange = CreateChange<Mark> | DeleteChange;

interface CourseStudentChangeMixin {
  course: Course;
  assessmentChanges: MarkChange[];
}

export type CourseStudentChange =
  AdditiveChange<CourseStudent>
  & CourseStudentChangeMixin;

const checkWeightChange = (
  taCourse: Course,
  dbCourseDoc: FirebaseFirestore.DocumentSnapshot,
): boolean => {
  if (dbCourseDoc.exists) {
    // name+date define a course, so if those change we'll
    // just have a new course. this means only weights need to
    // be updated, so if we have no weights, there is no need
    // to update anything.
    // also, if weights disappeared, keep the previous values
    if (taCourse.weights === undefined) {
      return false;
    }

    const dbCourse = dbCourseDoc.data() as Course;
    if (
      dbCourse.weights === undefined
      || dbCourse.weights.length !== taCourse.weights.length
    ) {
      return true;
    }

    for (let i = 0; i < taCourse.weights.length; ++i) {
      if (dbCourse.weights[i] !== taCourse.weights[i]) {
        return true;
      }
    }

    return false;
  }

  return true;
};

type SetLike<K> = Set<K> | Map<K, unknown>;

const setLikeDifference = <K, T extends SetLike<K>>(a: T, b: SetLike<K>): T => {
  // good enough for an internal function called twice
  // tslint:disable-next-line:no-any
  const difference = new (a.constructor as any)(a) as T;
  for (const val of b.keys()) {
    difference.delete(val);
  }

  return difference;
};

const getAssessmentChanges = (
  course: Course,
  dbStudentDoc: FirebaseFirestore.DocumentSnapshot,
  assessmentsRef: FirebaseFirestore.CollectionReference,
): CourseStudentChange => {
  const assessments = course.assessments ?? [];

  const taMap: Map<string, Mark> = new Map();  // for comparisons
  const updatedHashes: Set<string> = new Set();  // for return value
  for (const mark of assessments) {
    taMap.set(mark.hash, mark);
    updatedHashes.add(mark.hash);
  }

  if (!dbStudentDoc.exists) {
    // case: db empty, just copy everything from ta
    return {
      updated: { markHashes: Array.from(updatedHashes) },
      exists: false,
      path: dbStudentDoc.ref,
      course,
      assessmentChanges: assessments.map(
        (mark): MarkChange => ({
          updated: mark,
          exists: false,
          path: assessmentsRef.doc(mark.hash),
        }),
      ),
    };
  }

  const dbHashes = new Set((dbStudentDoc.data() as CourseStudent).markHashes);

  const hashesToRemove = setLikeDifference(dbHashes, taMap);
  const marksToAdd = setLikeDifference(taMap, dbHashes);

  const assessmentChanges: MarkChange[] = [];

  if (hashesToRemove.size + marksToAdd.size > 0) {
    for (const hash of hashesToRemove) {
      assessmentChanges.push({
        updated: undefined,
        exists: true,
        path: assessmentsRef.doc(hash),
      });
    }

    for (const [_, mark] of marksToAdd) {
      assessmentChanges.push({
        updated: mark,
        exists: false,
        path: assessmentsRef.doc(mark.hash),
      });
    }
  }

  return {
    updated: { markHashes: Array.from(updatedHashes) },
    exists: true,
    path: dbStudentDoc.ref,
    course,
    assessmentChanges,
  };
};

export const compareCourse = (
  taCourse: Course,
  dbCourseDoc: FirebaseFirestore.DocumentSnapshot,
): CourseChange | undefined => {
  if (checkWeightChange(taCourse, dbCourseDoc)) {
    return {
      updated: taCourse,
      exists: dbCourseDoc.exists,
      path: dbCourseDoc.ref,
    };
  }

  return undefined;
};

export const compareCourseStudent = (
  taCourse: Course,
  dbCourseDoc: FirebaseFirestore.DocumentSnapshot,
  dbStudentDoc: FirebaseFirestore.DocumentSnapshot,
): CourseStudentChange | undefined => {
  const change = getAssessmentChanges(
    taCourse,
    dbStudentDoc,
    dbCourseDoc.ref.collection("assessments"),
  );
  if (change.assessmentChanges.length > 0) {
    return change;
  }

  return undefined;
};

export const studentChangeToString = (
  studentChange: CourseStudentChange,
): string =>
  studentChange.assessmentChanges
    .map((change): string => {
      if (isDelete(change)) {
        return `-: ${change.path.id}`;
      }
      const m = change.updated;
      return `+: ${m.strand} ${m.name} ${m.numerator}/${m.denominator} (${m.weight})`;
    })
    .join("\n");
