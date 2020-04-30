import React, {useState, useEffect} from 'react';
import {StyleSheet, View, Text} from 'react-native';
import {Container, Content, Spinner} from 'native-base';
import {FirebaseAuthTypes, firebase} from '@react-native-firebase/auth';
import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import {GoogleSignin, User, statusCodes} from '@react-native-community/google-signin';
import AsyncStorage from '@react-native-community/async-storage';
import axios from 'axios';

import LoginPage from './react-native/pages/LoginPage';
import HomePage from './react-native/pages/HomePage';
import TaCredentialsPage from './react-native/pages/TaCredentialsPage';

import {WEB_CLIENT_ID} from './utils/keys.js';

const LoggedInPage = () => {

};

const App = () => {
  const [firebaseUserInfo, setFirebaseUserInfo] = useState<FirebaseAuthTypes.User | null>(null);
  const [userInfo, setUserInfo] = useState<User|null>(null);
  const [loggedIn, setLoggedIn] = useState<boolean>(false);
  const [initializing, setInitializing] = useState<boolean>(true);

  const updateToken = async () => {
    try {
      if (firebaseUserInfo) {
        const res = await axios.post('https://us-central1-avg-calc.cloudfunctions.net/updateFcmToken', {
          uid: firebaseUserInfo.uid,
          fcmToken: await AsyncStorage.getItem('fcmToken')
        });
        console.log(res.data);
      }
    } catch (err) {
      console.log(err);
    }    
  };


  const getToken = async () => {
    const hasPerm: FirebaseMessagingTypes.AuthorizationStatus = await messaging().hasPermission();
    if (hasPerm) {
      let fcmToken: string|null = await AsyncStorage.getItem('fcmToken');
      if (!fcmToken) {
        fcmToken = await messaging().getToken();
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

  //checks if the user is signed in
  useEffect(() => {
    const unsubscribe = firebase.auth().onAuthStateChanged((user: FirebaseAuthTypes.User|null) => {
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
      messaging().onTokenRefresh(async (fcmToken: string) => {
        await AsyncStorage.setItem('fcmToken', fcmToken);
        updateToken();
      });
      messaging().onMessage((message: FirebaseMessagingTypes.RemoteMessage) => {
        console.log(message);
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
  return (
    <HomePage
      setLoggedIn={setLoggedIn}
      firebaseUserInfo={firebaseUserInfo}
    />
  );
  // return (
  //   <TaCredentialsPage uid={userInfo?.uid}/>
  // );

}

export default App;
