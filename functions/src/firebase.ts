import * as admin from "firebase-admin";

admin.initializeApp({
  credential: admin.credential.cert("firebase-key.json"),
});

export {
  admin,
};
