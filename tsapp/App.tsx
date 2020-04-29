import React, {useState, useEffect} from 'react';
import {StyleSheet, View, Text} from 'react-native';
import {FirebaseAuthTypes, firebase} from '@react-native-firebase/auth';
import {GoogleSignin, User} from '@react-native-community/google-signin';

import Login from './Login';
import Home from './Home';


const App = () => {
  const [userInfo, setUserInfo] = useState<FirebaseAuthTypes.User | null>(null);
  const [loggedIn, setLoggedIn] = useState<boolean>(false);
  const [initializing, setInitializing] = useState<boolean>(true);

  useEffect(() => {
    return firebase.auth().onAuthStateChanged((user: FirebaseAuthTypes.User|null) => {
      setUserInfo(user);
      setInitializing(false);
    })
  }, []);

  if (initializing) return null;
  if (!loggedIn) {
    return (
      <Login 
        setLoggedIn={setLoggedIn}
        setUserInfo={setUserInfo}
      />
    );
  }
  return (
    <Home
      setLoggedIn={setLoggedIn}
      setUserInfo={setUserInfo}
    />
  );

}

export default App;
