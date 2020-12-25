import { pubsub } from "firebase-functions";
import NestedError from "nested-error-stacks";

import { checkEvent, getUsers, IUser, MaybeWrite, writeToDb } from "./db";
import { getFromTa } from "./taFetcher";

const processUser = async (
  doc: FirebaseFirestore.QueryDocumentSnapshot,
): Promise<Array<Promise<MaybeWrite>>> => {
  const user: IUser = doc.data() as IUser;
  if (doc.exists) {
    console.log(`retrieving user ${user.username}`);

    try {
      const courses = await getFromTa(user);

      return await writeToDb(user, courses);
    } catch (e) {
      if (e instanceof Error) {
        throw new NestedError("Failed to retrieve data from teachassist", e);
      }
      throw new Error(`Failed to retrieve data from teachassist: ${e}`);
    }
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

    const pendingOps = (await Promise.all(users.docs.map(processUser))).flat();

    return Promise.all(pendingOps).catch(console.error);
  });
