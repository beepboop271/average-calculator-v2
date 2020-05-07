import firestore from '@react-native-firebase/firestore';
import {v5 as uuidv5} from 'uuid';


export const errorCodes = {
  INVALID_CREDENTIALS: 0
};

export interface TaCredentials {
  uid: string;
  username: string;
  password: string;
};

export interface FcmToken {
  uid: string;
  fcmToken: string;
};

export interface NotificationSettings {
  uid: string;
  notifcationEnabled: boolean;
};

export interface DBLoggedIn {
  uid: string;
  loggedIn: boolean;
};

//checks if ta credentials are valid, then update to firestore
export const updateTaCredentials = (taCredentials: TaCredentials): Promise<unknown> => {
  return new Promise(async(resolve, reject) => {
      try {
        if (taCredentials.password === '' || taCredentials.username === '') {
          reject(errorCodes.INVALID_CREDENTIALS);
        }

        const user = new FormData();
        user.append('username', taCredentials.username);
        user.append('password', taCredentials.password);

        const res = await fetch('https://ta.yrdsb.ca/yrdsb/index.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          body: user
        });

        if (JSON.stringify(res).includes('error_message=3')) 
          reject(errorCodes.INVALID_CREDENTIALS);

        resolve(await updateCredentials(taCredentials));

      } catch (e) {
        reject(e);
      }
  });
};

export const updateFcmToken = (fcmToken: FcmToken) => {
  return updateCredentials(fcmToken);
}

export const updateNotificationSettings = (notificationPermission: NotificationSettings) => {
  return updateCredentials(notificationPermission);
};

export const setDBLoggedIn = (dbLoggedIn: DBLoggedIn) => {
  return updateCredentials(dbLoggedIn);
};


//updating to cloud firestore
const updateCredentials = (credentials: TaCredentials|FcmToken|NotificationSettings|DBLoggedIn) => {
  return new Promise(async (resolve, reject) => {
    try {
      const userSnapshot = await firestore().collection('users')
            .where('uid', '==', credentials.uid)
            .get();
      if (userSnapshot.size > 1) reject('Multiple user entries found');

      //new user setup, add default values
      if (userSnapshot.empty) {
        const data = {
          ...credentials,
          precision: 1, //ta avg precision
          notifcationEnabled: true //whether notifications are enabled for the user
        };
        await firestore().collection('users').add(data);
        await updateUserCourseInfo(credentials.uid);
        resolve('New user added');
      }

      await firestore()
          .collection('users').doc(userSnapshot.docs[0].id)
          .update(credentials);
      resolve('User credentials updated');

    } catch (err) {
      reject(err);
    }
  });
};


export const getUid = (studendId: string) => {
  const NAMESPACE = '95be0b73-182b-40cf-bdca-fa5320cb64d9';
  return uuidv5(studendId.trim(), NAMESPACE);
};


export const verifyTaUser = async (taCredentials: TaCredentials) => {
  const res = await (await fetch('https://us-central1-avg-calc.cloudfunctions.net/verifyUser', {
    method: 'POST',
    mode: 'cors',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(taCredentials)
  })).json();
  return res;
};


//update the course data if possible, then gets it, for offline purposes
export const updateUserCourseInfo = (uid: string): Promise<Response> => {
  return fetch('https://us-central1-avg-calc.cloudfunctions.net/updateUserCourseInfo', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({uid: uid})
  });
};


export const getDate = (): string => {
  const now = new Date();
  if (now.getMonth() >= 1 && now.getMonth() < 8) {
    // [Feb, Sep)
    return `Feb ${now.getFullYear()}`;
  } else {
    return `Sep ${now.getFullYear()}`;
  }
};