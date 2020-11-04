import * as functions from "firebase-functions";
import NestedError from "nested-error-stacks";

import { db, IUser, MaybeWrite, writeToDb } from "./dbWriter";
import { getFromTa } from "./taFetcher";
import { ICourse } from "./taParser";

type QuerySnapshot = FirebaseFirestore.QuerySnapshot;

// 0 * * 1-6,9-12 0,6
// 0 0-8,16-23 * 1-6,9-12 1-5
// 0,20,40 9-15 * 1-6,9-12 1-5
export const fun = functions.pubsub
  .topic("poll-ta")
  .onPublish(async (_msg, ctx): Promise<unknown> => {
    // idempotency check
    const matchingEvent = await db
      .collection("events")
      .where("id", "==", ctx.eventId)
      .limit(1)
      .get();
    if (!matchingEvent.empty) {
      throw new Error("pubsub event already processed!");
    }

    const pendingOps: Array<Promise<unknown>> = [];

    pendingOps.push(
      db
      .collection("events")
      .doc()
      .set({ id: ctx.eventId })
      .catch((err) => {
        if (err instanceof Error) {
          throw new NestedError("Failed to write event", err);
        }
        throw new Error(`Failed to write event: ${err}`);
      }),
    );

    let users: QuerySnapshot;
    try {
      users = await db.collection("users").get();
    } catch (e) {
      if (e instanceof Error) {
        throw new NestedError("Failed to retrieve users", e);
      }
      throw new Error(`Failed to retrieve users: ${e}`);
    }

    if (users.empty) {
      throw new Error("no users found");
    }

    pendingOps.push(Promise.all(
      users.docs.map(async (doc): Promise<MaybeWrite[]> => {
        if (doc.exists) {
          console.log(`retrieving user ${doc.data().username}`);

          let courses: ICourse[];
          try {
            courses = await getFromTa(doc.data() as IUser);
          } catch (e) {
            if (e instanceof Error) {
              throw new NestedError("Failed to retrieve data from teachassist", e);
            }
            throw new Error(`Failed to retrieve data from teachassist: ${e}`);
          }

          return Promise.all(writeToDb(doc.data() as IUser, courses));
        }
        throw new Error(`User document does not exist: ${doc.ref.path}`);
      }),
    ));

    return Promise.all(pendingOps);
  });
