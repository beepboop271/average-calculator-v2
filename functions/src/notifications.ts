import { IUser } from "./db";
import { admin } from "./firebase";

const fcm = admin.messaging();

const shouldRemoveToken = (
  response: admin.messaging.SendResponse,
): boolean => {
  const code = response.error?.code;

  // not sure why but hardcoding is the suggested method of
  // dealing with error codes. they "will remain the same
  // between backward-compatible versions" but the strings are
  // available in firebase-admin/lib/utils/error.js
  // if only they were exported

  return (
    code !== undefined
    && (
      // don't remove tokens on other errors
      code === "messaging/registration-token-not-registered"
      || code === "messaging/invalid-registration-token"
      || code === "messaging/invalid-argument"
    )
  );
};

export const sendMessage = async (
  message: admin.messaging.MulticastMessage,
  dryRun?: boolean,
): Promise<string[]> => {
  const res = await fcm.sendMulticast(message, dryRun);

  if (res.failureCount > 0) {
    return message.tokens.filter(
      (_, idx): boolean => !shouldRemoveToken(res.responses[idx]),
    );
  }

  return message.tokens;
};

export const buildMessage = (
  user: IUser,
  title: string,
  body: string,
): admin.messaging.MulticastMessage => ({
  notification: {
    title,
    body,
  },
  tokens: user.devices,
});
