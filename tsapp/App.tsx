import React, {useState, useEffect} from 'react';
import {GoogleSignin, User, statusCodes} from '@react-native-community/google-signin';
import AsyncStorage from '@react-native-community/async-storage';
import notifee from '@notifee/react-native';
import auth, {FirebaseAuthTypes} from '@react-native-firebase/auth';
import messaging, {FirebaseMessagingTypes} from '@react-native-firebase/messaging';

import {Root} from 'native-base';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';

import LoginPage from './src/pages/LoginPage';
import LoggedInPage from './src/pages/LoggedInPage';
import SplashScreen from './src/components/SplashScreen';
import {UserContext, IUserContext} from './src/utils/contexts';
import {
  updateFcmToken,
  updateNotificationSettings
} from './src/utils/functions';
import {WEB_CLIENT_ID} from './keys.js';


const Stack = createStackNavigator();

const App = () => {
  const [firebaseUserInfo, setFirebaseUserInfo] = useState<FirebaseAuthTypes.User|null>(null);
  const [loggedIn, setLoggedIn] = useState<boolean>(false);
  const [initializing, setInitializing] = useState<boolean>(true);
  const [loggedInFromTa, setLoggedInFromTa] = useState<boolean>(false);

  //update fcm token to the cloud
  const updateToken = async () => {
    try {
      if (firebaseUserInfo) {
        const fcmToken = await AsyncStorage.getItem('fcmToken');
        console.log('updated token to firebase');
        if (!fcmToken) throw new Error('fcmToken missing from async storage');
        const res = await updateFcmToken({
          uid: firebaseUserInfo.uid,
          fcmToken: fcmToken
        });
        console.log(res);
      }
    } catch (err) {
      console.log(err);
    }    
  };

  //set initial notification setting upon boot
  // const setNotificationSetting = async () => {
  //   const notifEnabled: string|null = await AsyncStorage.getItem('notificationEnabled');
  //   if (notifEnabled === null) {
  //     AsyncStorage.setItem('notificationEnabled', 'true');
  //     if (!firebaseUserInfo) throw new Error('firebase user info missing');
  //     updateNotificationSettings({
  //       uid: firebaseUserInfo.uid,
  //       notifcationEnabled: true
  //     });
  //   }
  // };

  //get token upon mounting the app, if update the token if it doesn't exist
  //@return true upon creating new token, false otherwise
  const getToken = async () => {
    const hasPerm: FirebaseMessagingTypes.AuthorizationStatus = await messaging().hasPermission();
    if (hasPerm) {
      console.log('get token');
      // setNotificationSetting();
      let fcmToken: string|null = await AsyncStorage.getItem('fcmToken');
      if (!fcmToken) {
        console.log('got new token');
        fcmToken = await messaging().getToken();
        await AsyncStorage.setItem('fcmToken', fcmToken);
        await updateToken();
        return true;
      }
      return false;
    } else {
      throw new Error('no permission');
    }
  };

  //configuration for google sign-in
  useEffect(() => {
    GoogleSignin.configure({
      webClientId: WEB_CLIENT_ID,
      offlineAccess: true
    });
  }, []);


  //checks if the user is signed in
  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged((user: FirebaseAuthTypes.User|null) => {
      setFirebaseUserInfo(user);
      if (user) {
        setLoggedIn(true);

        //force update the token to accomodate if there are multiple users
        //don't worry about the readability :))
        (async() => {if (!(await getToken())) updateToken()})();
        
        
      } else {
        setLoggedIn(false);
      }
      setInitializing(false);
    });
    return unsubscribe;
  }, [loggedIn]);


  //add token listeners
  useEffect(() => {
    //get tokens if logged in
    if (loggedIn) {
      getToken();
      messaging().onTokenRefresh(async (fcmToken: string) => {
        console.log('got refreshed token');
        await AsyncStorage.setItem('fcmToken', fcmToken);
        updateToken();
      });
      messaging().setBackgroundMessageHandler(async (remoteMessage) => {
        console.log('background message: ');
        console.log(remoteMessage);
      });
      messaging().onMessage(async remoteMessage => {
        console.log('foreground message: ');
        console.log(remoteMessage);
      });
    }
  }, [loggedIn]);

  if (initializing) {
    return <SplashScreen/>
  }

  const userContext: IUserContext = {
    setLoggedIn: setLoggedIn,
    uid: firebaseUserInfo?.uid,
    name: firebaseUserInfo?.displayName || undefined,
    loggedInFromTa: loggedInFromTa,
    setLoggedInFromTa: setLoggedInFromTa
  };

  return ( //don't question the amount of wraps
    <Root>
      <UserContext.Provider value={userContext}>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{
            headerShown: false
          }}>
            {loggedIn ? (
              <Stack.Screen
                name='LoggedInPage'
                component={LoggedInPage}
              />
            ) : (
              <Stack.Screen 
                name='LoginPage' 
                component={LoginPage}
                options={{
                  animationTypeForReplace: loggedIn ? 'push' : 'pop',
                }}
              />
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </UserContext.Provider>
    </Root>
  );

}

export default App;
