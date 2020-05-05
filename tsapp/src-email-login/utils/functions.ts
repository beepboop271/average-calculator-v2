import firestore from '@react-native-firebase/firestore';



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


//updating to cloud firestore
const updateCredentials = (credentials: TaCredentials|FcmToken|NotificationSettings) => {
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
          precision: 1 //ta avg precision
        };
        await firestore().collection('users').add(data);
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

