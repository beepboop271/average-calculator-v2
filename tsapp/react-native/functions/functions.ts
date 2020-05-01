import firebase from 'react-native-firebase';
import axios from 'axios';

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
}

export const updateTaCredentials = (taCredentials: TaCredentials): Promise<unknown> => {
  return new Promise(async(resolve, reject) => {
      try {
        if (taCredentials.password === '' || taCredentials.username === '') {
          reject(errorCodes.INVALID_CREDENTIALS);
        }

        const user = new FormData();
        user.append('username', taCredentials.username);
        user.append('password', taCredentials.password);
        //test credentials before updating
        const homePage: string = (await axios.post(
          "https://ta.yrdsb.ca/yrdsb/index.php",
          user,
          {headers: {'Content-Type': 'multipart/form-data'}}
        )).data;

        if (/Invalid Login/.test(homePage)) reject(errorCodes.INVALID_CREDENTIALS);
        resolve(await updateCredentials(taCredentials));

      } catch (e) {
        reject(e);
      }
  });
};

export const updateFcmToken = (fcmToken: FcmToken) => {
  return updateCredentials(fcmToken);
}

const updateCredentials = (credentials: TaCredentials|FcmToken) => {
  return new Promise(async (resolve, reject) => {
    try {
      const userSnapshot = await firebase.firestore().collection('users')
            .where('uid', '==', credentials.uid)
            .get();

      if (userSnapshot.size > 1) reject('Multiple user entries found');
      if (userSnapshot.empty) {
        await firebase.firestore().collection('users').add(credentials);
        resolve('New user added');
      }

      await firebase.firestore()
          .collection('users').doc(userSnapshot.docs[0].id)
          .update(credentials);
      resolve('User credentials updated');

    } catch (err) {
      reject(err);
    }
  });
  
};