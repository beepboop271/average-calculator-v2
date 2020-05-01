import React, {useState, useEffect} from 'react';
import {Container, Header, Content, Form, Item, Input, Button, Text} from 'native-base';
import {StyleSheet, View} from 'react-native';
// import {FirebaseAuthTypes, firebase} from '@react-native-firebase/auth';
// import firebase, {RNFirebase} from 'react-native-firebase';
import auth from '@react-native-firebase/auth';
import {GoogleSignin, User, statusCodes, GoogleSigninButton} from '@react-native-community/google-signin';
import InputBox from '../components/InputBox';


interface Props {
  setLoggedIn: React.Dispatch<React.SetStateAction<boolean>>;
};


const Line: React.FC = () => {
  return (
    <View style={styles.lineContainer}>
        <View style={styles.line} />
        <Text style={styles.lineText}>OR</Text>
        <View style={styles.line} />
    </View>
  );
};

const LoginPage: React.FC<Props> = ({setLoggedIn}) => {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  const [userInfo, setUserInfo] = useState<User | null>(null);
  const [isInvalid, setIsInvalid] = useState<boolean>(false);

  const signIn = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      setUserInfo(userInfo);

      const tokens = await GoogleSignin.getTokens();
      const credential = auth.GoogleAuthProvider
                          .credential(tokens.idToken, tokens.accessToken);
      const firebaseUserCredential = await auth()
                                    .signInWithCredential(credential);
      // setFirebaseUser(firebaseUserCredential.user);
      // console.log(firebaseUserCredential);
      setLoggedIn(true);

    } catch (err) {
      if (err.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log('user cancelled');
      } else if (err.code === statusCodes.IN_PROGRESS) {
        console.log('sign in is in progress')
      } else if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        console.log('play services not available');
      } else {
        console.log('who knows what happened');
        console.log(err);
      }
    }
  };

  return (
    <Container>
      <Header>
        <Text>style this text later</Text>
      </Header>
      <Content style={styles.content}>
        <GoogleSigninButton
          size={GoogleSigninButton.Size.Wide}
          color={GoogleSigninButton.Color.Dark}
          onPress={signIn}
        />
        <Line/>
        <Form>
          <InputBox 
            placeholder='Username' 
            value={username}
            autoCompleteType='username'
            setValue={setUsername}
            isInvalid={isInvalid}
            xIcon={true}
          />
          <InputBox 
            placeholder='Password' 
            value={password}
            autoCompleteType='password'
            secureTextEntry={true}
            setValue={setPassword}
            isInvalid={isInvalid}
          />
        </Form>
        <Button primary style={styles.button}>
          <Text style={styles.buttonText}>Login</Text>
        </Button>

      </Content>
    </Container>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: '10%',
    paddingTop: '40%'
  },
  button: {
    width: '50%',
    marginLeft: 'auto',
    marginRight: 'auto',
    marginTop: '5%'
  },
  buttonText: {
    marginLeft: 'auto',
    marginRight: 'auto',
    fontSize: 20
  },
  line: {
    height: 1,
    flex: 1,
    alignSelf: 'center',
    backgroundColor: 'gray'
  },
  lineText: {
    fontSize: 15,
    color: 'gray',
    paddingHorizontal: 3
  },
  lineContainer: {
    marginTop: 5,
    marginBottom: 5,
    flexDirection: 'row'
  }
});

export default LoginPage;