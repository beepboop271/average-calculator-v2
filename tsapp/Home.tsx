import React, {useState, useEffect} from 'react';
import {Container, Content, Button, Text} from 'native-base';
import {GoogleSignin} from '@react-native-community/google-signin';
import {firebase, FirebaseAuthTypes} from '@react-native-firebase/auth';


const HomePage = (props: {
  setLoggedIn: React.Dispatch<React.SetStateAction<boolean>>,
  setUserInfo: React.Dispatch<React.SetStateAction<FirebaseAuthTypes.User|null>>
}) => {
  const [userInfo, setUserInfo] = useState<FirebaseAuthTypes.User|null>(null);

  const signOut = async () => {
    try {
      await GoogleSignin.revokeAccess();
      await GoogleSignin.signOut();
      setUserInfo(null);
      props.setUserInfo(userInfo);
      props.setLoggedIn(false);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    const user: FirebaseAuthTypes.User|null = firebase.auth().currentUser;
    setUserInfo(user);
  }, []);

  return (
    <Container>
      <Content>
        {
          userInfo
          ? <Text>welcome {userInfo.displayName}</Text>
          : <Text>Signing out...</Text>
        }
        <Button onPress={signOut}>
          <Text>Sign out</Text>
        </Button>
        <Button onPress={() => console.log(userInfo?.uid)}>
          <Text>Test</Text>
        </Button>
      </Content>
    </Container>
  );
};

export default HomePage;