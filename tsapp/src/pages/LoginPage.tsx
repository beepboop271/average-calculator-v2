import React, {useState, useEffect, useContext} from 'react';
import {Image, StatusBar} from 'react-native';
import {Container, Content, Form, Spinner, Text} from 'native-base';
import {StyleSheet, View} from 'react-native';
import auth from '@react-native-firebase/auth';
import {
  GoogleSignin, 
  User, 
  statusCodes, 
  GoogleSigninButton
} from '@react-native-community/google-signin';
import InputBox from '../components/InputBox';
import LoginButton from '../components/LoginButton';
import {UserContext} from '../utils/contexts';
import {adobeMonochromaticBlue} from '../utils/colours';
import {createToast} from '../utils/toast'
import {verifyTaUser, updateTaCredentials, getUid, TaCredentials} from '../utils/functions';

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

const LoginHomePage: React.FC<Props> = ({navigation}) => {
  const [studentId, setStudentId] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [isInvalid, setIsInvalid] = useState<boolean>(false);

  const {setLoggedIn, setLoggedInFromTa} = useContext(UserContext);
  if (!setLoggedIn || !setLoggedInFromTa) {
    throw new Error('setLoggedIn provider missing');
  }


  const googleSignIn = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      await GoogleSignin.signIn();

      const tokens = await GoogleSignin.getTokens();
      const credential = auth.GoogleAuthProvider
                          .credential(tokens.idToken, tokens.accessToken);
      await auth().signInWithCredential(credential);
      setLoggedInFromTa(false);
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

  const taLogin = async () => {
    setIsSigningIn(true);
    if (studentId === '' || password === '') {
      createToast({
        text: 'Please fill out all fields',
        type: 'warning'
      });
      setPassword('');
      setIsSigningIn(false);
      return;
    }
    try {
      const uid = getUid(studentId);

      const taCredentials: TaCredentials = {
        username: studentId.trim(),
        password: password,
        uid: uid
      };
      
      const res = await verifyTaUser(taCredentials);
      if (res.error) {
        setPassword('');
        setIsInvalid(true);
        createToast({
          text: 'Incorrect username or password',
          type: 'danger'
        });
      } else {
        const firebaseUserCredentials = await auth().signInWithCustomToken(res.token);
        firebaseUserCredentials.user.updateProfile({
          displayName: studentId
        });
        updateTaCredentials(taCredentials);
        setLoggedInFromTa(true);
        setLoggedIn(true);
      }
    } catch (err) {
      console.log(err);
    }
    setIsSigningIn(false);    
  };

  return (
    <Container>
      <StatusBar backgroundColor='white' barStyle="dark-content"/>
      <Content style={styles.content}>
        <Image source={require('../assets/logo.png')} style={styles.logo}/>
        <GoogleSigninButton
          size={GoogleSigninButton.Size.Wide}
          color={GoogleSigninButton.Color.Dark}
          onPress={googleSignIn}
          style={{alignSelf: 'center'}}
        />
        <Line/>
        <Form>
          <InputBox 
            icon='person'
            placeholder='Student ID' 
            value={studentId}
            autoCompleteType='username'
            setValue={setStudentId}
            isInvalid={isInvalid}
            setIsInvalid={setIsInvalid}
            xIcon={true}
            disabled={isSigningIn}
          />
          <InputBox 
            icon='lock'
            placeholder='Password' 
            value={password}
            autoCompleteType='password'
            secureTextEntry={true}
            setValue={setPassword}
            isInvalid={isInvalid}
            setIsInvalid={setIsInvalid}
            disabled={isSigningIn}
          />
        </Form>
        {isSigningIn ? <Spinner color='blue'/> : null}
        <LoginButton
          buttonText='Login'
          buttonOnPress={taLogin}
        />
      </Content>
    </Container>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: '5%',
  },
  line: {
    height: 1,
    flex: 1,
    alignSelf: 'center',
    backgroundColor: adobeMonochromaticBlue.GRAY
  },
  lineText: {
    fontSize: 15,
    color: adobeMonochromaticBlue.GRAY,
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
  },
});

export default LoginHomePage;