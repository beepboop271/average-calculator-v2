import React, {useState, useEffect} from 'react';
import {Container, Header, Content, Form, Item, Input, Button, Text} from 'native-base';
import {StyleSheet, View} from 'react-native';
import {FirebaseAuthTypes, firebase} from '@react-native-firebase/auth';
import {GoogleSignin, User, statusCodes, GoogleSigninButton} from '@react-native-community/google-signin';
import {WEB_CLIENT_ID} from './utils/keys.js';



const InputBox = (props: {
  placeholder: string,
  value: string,
  autoFocus?: boolean,
  secureTextEntry?: boolean,
  autoCompleteType: "username" | "password" | "name" | "cc-csc" | "cc-exp" | "cc-exp-month" | "cc-exp-year" | "cc-number" | "email" | "postal-code" | "street-address" | "tel" | "off" | undefined,
  setValue: React.Dispatch<React.SetStateAction<string>>
}): JSX.Element => {
  return (
    <Item rounded style={styles.item}>
      <Input 
        placeholder={props.placeholder}
        autoCompleteType={props.autoCompleteType}
        value={props.value}
        autoFocus={props.autoFocus}
        onChangeText={(text) => props.setValue(text)}
        onSubmitEditing={() => props.setValue('')}
        placeholderTextColor='#a9a9a9'
        secureTextEntry={props.secureTextEntry}
      />
    </Item>
  );
};

const Line = (): JSX.Element => {
  return (
    <View style={styles.lineContainer}>
        <View style={styles.line} />
        <Text style={styles.lineText}>OR</Text>
        <View style={styles.line} />
    </View>
  );
};


const Login = (props: {
  setLoggedIn: React.Dispatch<React.SetStateAction<boolean>>,
  setUserInfo: React.Dispatch<React.SetStateAction<FirebaseAuthTypes.User|null>>
}): JSX.Element => {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  const [userInfo, setUserInfo] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseAuthTypes.User|null>(null);

  useEffect(() => {
    GoogleSignin.configure({
      scopes: [
        'https://www.googleapis.com/auth/cloud-platform'
      ],
      webClientId: WEB_CLIENT_ID,
      offlineAccess: true,
      forceCodeForRefreshToken: true
    });
  }, []);

  const signIn = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      setUserInfo(userInfo);

      const tokens = await GoogleSignin.getTokens();
      const credential = firebase.auth.GoogleAuthProvider
          .credential(tokens.idToken, tokens.accessToken);
      const firebaseUserCredential = await firebase.auth()
          .signInWithCredential(credential);
      setFirebaseUser(firebaseUserCredential.user);
      console.log(firebaseUserCredential);

      props.setLoggedIn(true);
      props.setUserInfo(firebaseUser);

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
          />
          <InputBox 
            placeholder='Password' 
            value={password}
            autoCompleteType='password'
            secureTextEntry={true}
            setValue={setPassword}
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
  item: {
    margin: '3%',
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

export default Login;