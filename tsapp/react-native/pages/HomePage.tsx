import React, {useState, useEffect} from 'react';
import {Container, Content, Button, Text, Spinner} from 'native-base';
import {GoogleSignin} from '@react-native-community/google-signin';
import {firebase, FirebaseAuthTypes} from '@react-native-firebase/auth';


interface Props {
  setLoggedIn: React.Dispatch<React.SetStateAction<boolean>>;
  firebaseUserInfo: FirebaseAuthTypes.User|null;
};

const HomePage: React.FC<Props> = ({setLoggedIn, firebaseUserInfo}) => {
  const [isSigningOut, setIsSigningOut] = useState<boolean>(false);

  const signOut = async () => {
    try {
      setIsSigningOut(true);
      await GoogleSignin.revokeAccess();
      await GoogleSignin.signOut();
      await firebase.auth().signOut();
      // setFirebaseUserInfo(null);
      setIsSigningOut(false);
      setLoggedIn(false);
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <Container>
      <Content>
        <Button onPress={signOut}>
          <Text>Sign out</Text>
        </Button>
        <Button onPress={() => console.log(firebaseUserInfo?.uid)}>
          <Text>Uid</Text>
        </Button>
        {
          isSigningOut
          ? <Spinner/>
          : null
        }
      </Content>
    </Container>
  );
};

export default HomePage;