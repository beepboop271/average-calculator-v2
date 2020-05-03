import React, {useState, useEffect, useContext} from 'react';
import {Image} from 'react-native';
import {Container, Content, Form, Item, Button, Text} from 'native-base';
import {StyleSheet, View} from 'react-native';
import auth from '@react-native-firebase/auth';
import {
  GoogleSignin, 
  User, 
  statusCodes, 
  GoogleSigninButton
} from '@react-native-community/google-signin';
import InputBox from '../components/InputBox';
import {UserContext} from '../utils/contexts';


interface Props {
  navigation: any;
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

const LoginPage: React.FC<Props> = ({navigation}) => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  const [userInfo, setUserInfo] = useState<User | null>(null);
  const [isInvalid, setIsInvalid] = useState<boolean>(false);

  const {setLoggedIn} = useContext(UserContext);
  if (!setLoggedIn) throw new Error('setLoggedIn provider missing');


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
      <Content style={styles.content}>
        <Image source={require('../assets/logo.png')} style={styles.logo}/>
        <GoogleSigninButton
          size={GoogleSigninButton.Size.Wide}
          color={GoogleSigninButton.Color.Dark}
          onPress={signIn}
        />
        <Line/>
        <Form>
          <InputBox 
            placeholder='Email' 
            value={email}
            autoCompleteType='email'
            setValue={setEmail}
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
    padding: '10%'
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
  },
  logo: {
    width: 170,
    height: 170,
    alignSelf: 'center',
    marginTop: '10%',
    marginBottom: '5%'
  }
});

export default LoginPage;