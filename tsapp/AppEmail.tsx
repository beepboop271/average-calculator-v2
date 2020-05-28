import React, {useState, useEffect} from 'react';
import AsyncStorage from '@react-native-community/async-storage';
import notifee from '@notifee/react-native';
import auth, {FirebaseAuthTypes} from '@react-native-firebase/auth';
import firestore, {
  FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';
import messaging, {
  FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';

import {Root} from 'native-base';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';

import LoginPage from './src-email-login/pages/LoginPage';
import LoggedInPage from './src-email-login/pages/LoggedInPage';
import SplashScreen from './src-email-login/components/SplashScreen';
import {UserContext, IUserContext} from './src-email-login/utils/contexts';
import {
  ThemeContext,
  lightTheme,
  darkTheme,
  Theme,
} from './src-email-login/utils/contexts';
import {
  updateFcmToken,
  getUserSnap,
  setDBLoggedIn,
} from './src-email-login/utils/functions';
import {WEB_CLIENT_ID} from './keys.js';
import {
  GoogleSignin,
  User,
  statusCodes,
} from '@react-native-community/google-signin';
import EmailConfirmationModal from './src-email-login/components/EmailConfirmationModal';

const Stack = createStackNavigator();

const App = () => {
  const [
    firebaseUserInfo,
    setFirebaseUserInfo,
  ] = useState<FirebaseAuthTypes.User | null>(null);
  const [loggedIn, setLoggedIn] = useState<boolean>(false);
  const [initializing, setInitializing] = useState<boolean>(true);
  const [name, setName] = useState<string>('');
  const [animationEnabled, setAnimationEnabled] = useState<boolean>(true);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [precision, setPrecision] = useState<number>(2);
  const [hasTaCredential, setHasTaCredential] = useState<boolean>(false);

  //update fcm token to the cloud
  const updateToken = async () => {
    try {
      if (firebaseUserInfo) {
        const fcmToken = await AsyncStorage.getItem('fcmToken');
        console.log('updated token to firebase');
        if (!fcmToken) throw new Error('fcmToken missing from async storage');
        const res = await updateFcmToken({
          uid: firebaseUserInfo.uid,
          fcmToken: fcmToken,
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
      let fcmToken: string | null = await AsyncStorage.getItem('fcmToken');
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

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: WEB_CLIENT_ID,
      offlineAccess: true,
    });
    firestore().settings({
      persistence: true,
    } as FirebaseFirestoreTypes.Settings);
  }, []);

  useEffect(() => {
    (async () => {
      const theme = await AsyncStorage.getItem('theme');
      if (!theme) await AsyncStorage.setItem('theme', 'light');
      setDarkMode(theme === 'dark' ? true : false);
    })();
  }, []);

  //checks if the user is signed in
  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(
      (user: FirebaseAuthTypes.User | null) => {
        setFirebaseUserInfo(user);
        if (user) {
          setLoggedIn(true);
          initUser();
        }
        setInitializing(false);
      },
    );
    return unsubscribe;
  }, [loggedIn]);

  const initUser = () => {
    if (!firebaseUserInfo || !firebaseUserInfo.emailVerified) return;

    setName(firebaseUserInfo.displayName || '');

    //force update the token to accomodate if there are multiple users
    //don't worry about the readability :))
    (async () => {
      if (!(await getToken())) updateToken();
      if (!firebaseUserInfo.uid) throw new Error('missing uid');
      setDBLoggedIn({uid: firebaseUserInfo.uid, loggedIn: true});
      const userData = (await getUserSnap(firebaseUserInfo.uid)).data();
      setAnimationEnabled(userData.animationEnabled);
      setPrecision(userData.precision);
      setHasTaCredential(userData.username ? true : false);
    })();
  };

  useEffect(() => {
    if (firebaseUserInfo?.emailVerified) {
      initUser();
    }
  }, [firebaseUserInfo?.emailVerified]);

  const refresh = async (
    setRefreshing: React.Dispatch<React.SetStateAction<boolean>>,
  ) => {
    setRefreshing(true);
    await auth().currentUser?.reload();
    setFirebaseUserInfo(auth().currentUser);
    setRefreshing(false);
  };

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
      messaging().onMessage(async (remoteMessage) => {
        console.log('foreground message: ');
        console.log(remoteMessage);
      });
    }
  }, [loggedIn]);

  if (initializing) {
    return <SplashScreen />;
  }

  if (loggedIn && !firebaseUserInfo?.emailVerified) {
    return <EmailConfirmationModal refresh={refresh} />;
  }

  const userContext: IUserContext = {
    setLoggedIn: setLoggedIn,
    uid: firebaseUserInfo?.uid,
    name: name,
    setName: setName,
    isLoggedIn: loggedIn,
    animationEnabled: animationEnabled,
    setAnimationEnabled: setAnimationEnabled,
    darkMode: darkMode,
    setDarkMode: setDarkMode,
    precision: precision,
    setPrecision: setPrecision,
    hasTaCredential: hasTaCredential,
    setHasTaCredential: setHasTaCredential,
  };

  const theme: Theme = {
    mode: darkMode ? 'dark' : 'light',
    colour: darkMode ? darkTheme : lightTheme,
  };

  return (
    //don't question the amount of wraps
    <Root>
      <UserContext.Provider value={userContext}>
        <ThemeContext.Provider value={theme}>
          <NavigationContainer>
            <Stack.Navigator
              screenOptions={{
                headerShown: false,
              }}>
              {loggedIn ? (
                <Stack.Screen name="LoggedInPage" component={LoggedInPage} />
              ) : (
                <Stack.Screen
                  name="LoginPage"
                  component={LoginPage}
                  options={{
                    animationTypeForReplace: loggedIn ? 'push' : 'pop',
                  }}
                />
              )}
            </Stack.Navigator>
          </NavigationContainer>
        </ThemeContext.Provider>
      </UserContext.Provider>
    </Root>
  );
};

export default App;
