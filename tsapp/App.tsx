import React, {useState, useEffect} from 'react';
import {StyleSheet, View, Text} from 'react-native';
import {Container, Content, Spinner} from 'native-base';
import {GoogleSignin, User, statusCodes} from '@react-native-community/google-signin';
import AsyncStorage from '@react-native-community/async-storage';
import firebase, {RNFirebase} from 'react-native-firebase';

import LoginPage from './react-native/pages/LoginPage';
import HomePage from './react-native/pages/HomePage';
import TaCredentialsPage from './react-native/pages/TaCredentialsPage';

import {updateFcmToken, FcmToken} from './react-native/functions/functions';
import {WEB_CLIENT_ID} from './utils/keys.js';

const LoggedInPage = () => {

};

const App = () => {
  const [firebaseUserInfo, setFirebaseUserInfo] = useState<RNFirebase.auth.OrNull<RNFirebase.User>>(null);
  const [userInfo, setUserInfo] = useState<User|null>(null);
  const [loggedIn, setLoggedIn] = useState<boolean>(false);
  const [initializing, setInitializing] = useState<boolean>(true);

  const updateToken = async () => {
    try {
      if (firebaseUserInfo) {
        const res = await updateFcmToken({
          uid: firebaseUserInfo.uid,
          fcmToken: await AsyncStorage.getItem('fcmToken')
        } as FcmToken);
        console.log(res);
      }
    } catch (err) {
      console.log(err);
    }    
  };


  const getToken = async () => {
    const hasPerm: boolean = await firebase.messaging().hasPermission();
    if (hasPerm) {
      console.log('get token');
      let fcmToken: string|null = await AsyncStorage.getItem('fcmToken');
      if (!fcmToken) {
        console.log('got new token');
        fcmToken = await firebase.messaging().getToken();
        await AsyncStorage.setItem('fcmToken', fcmToken);
        await updateToken();
      }
    }
  };

  //configuration for google sign-in
  useEffect(() => {
    GoogleSignin.configure({
      scopes: [
        'https://www.googleapis.com/auth/cloud-platform'
      ],
      webClientId: WEB_CLIENT_ID,
      offlineAccess: true
    });
  }, []);


  useEffect(() => {
    // Build a channel
    const channel = new firebase.notifications.Android.Channel('kms', 'ahh', firebase.notifications.Android.Importance.Max)
    .setDescription('My apps test channel');

    // Create the channel
    firebase.notifications().android.createChannel(channel);
    (async() => {
      const notifOpen = await firebase.notifications().getInitialNotification();
      if (notifOpen) {
        const action = notifOpen.action;
        const notification = notifOpen.notification;
      }
    })();
    firebase.notifications().onNotificationDisplayed((notification => {
      console.log(notification);
    }))
    firebase.notifications().onNotification((notification => {
      notification.android.setChannelId('kms');
      firebase.notifications().displayNotification(notification);
    }))
    
  }, []);

  //checks if the user is signed in
  useEffect(() => {
    const unsubscribe = firebase.auth().onAuthStateChanged((user: RNFirebase.auth.OrNull<RNFirebase.User>) => {
      setFirebaseUserInfo(user);

      //get google sign in not firebase sign in
      (async () => {
        try {
          const signedIn = await GoogleSignin.isSignedIn();
          if (signedIn) {
            const curUser = await GoogleSignin.getCurrentUser();
            setUserInfo(curUser);
            if (user && curUser) setLoggedIn(true);
          }
          setInitializing(false);

        } catch (err) {
          if (err.code === statusCodes.SIGN_IN_REQUIRED) {
            setLoggedIn(false);
            setInitializing(false);
          } else {
            console.log(err);
          }
        }
      })();
    });

    return unsubscribe;
  }, [loggedIn]);

  //add token listeners
  useEffect(() => {
    //get tokens if logged in
    if (loggedIn) {
      getToken();
      firebase.messaging().onTokenRefresh(async (fcmToken: string) => {
        console.log('got refreshed token');
        await AsyncStorage.setItem('fcmToken', fcmToken);
        updateToken();
      });
      // firebase.messaging().(async (remoteMessages) => {
      //   console.log('background message: ');
      //   console.log(remoteMessages);
      // });
      firebase.messaging().onMessage(async remoteMessage => {
        console.log('foreground message: ');
        console.log(remoteMessage);
      });
    }
  }, [loggedIn])

  if (initializing) {
    return (
      <Container>
        <Content>
          <Spinner color='blue'/>
        </Content>
      </Container>
    );
  }

  if (!loggedIn) {
    return (
      <LoginPage 
        setLoggedIn={setLoggedIn}
        // firebaseUserInfo={firebaseUserInfo}
      />
    );
  }
  // return (
  //   <HomePage
  //     setLoggedIn={setLoggedIn}
  //     firebaseUserInfo={firebaseUserInfo}
  //   />
  // );
  return (
    <TaCredentialsPage uid={firebaseUserInfo?.uid}/>
  );

}

export default App;
