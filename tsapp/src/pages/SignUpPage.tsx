import React, {useState} from 'react';
import {Container, Content, Text, Spinner} from 'native-base';
import { StyleSheet, SegmentedControlIOS } from 'react-native';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';

import InputBox from '../components/InputBox';
import HeaderSignUp from '../components/HeaderSignUp';
import LoginButton from '../components/LoginButton';
import {colour} from '../utils/colours';
import {createToast} from '../utils/toast';

interface Props {
  navigation: any;
};

const SignupPage: React.FC<Props> = ({navigation}) => {
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPass, setConfirmPass] = useState<string>('');
  const [isInvalid, setIsInvaild] = useState<boolean>(false);
  const [isSigningUp, setIsSigningUp] = useState<boolean>(false);

  const signUp = async () => {
    setIsSigningUp(true);

    if (name === '' || password === '' || email === '' || confirmPass === '') {
      createToast({
        text: 'Please fill out all fields!',
        type: 'warning'
      });
      setIsSigningUp(false);
      return;
    }

    if (password !== confirmPass) {
      setPassword('');
      setConfirmPass('');
      createToast({
        text: "Passwords don't match!",
        type: 'danger'
      });
      setIsSigningUp(false);
      return;
    }

    //try creating the user
    try {
      const firebaseUserCredential: FirebaseAuthTypes.UserCredential
          = await auth().createUserWithEmailAndPassword(email.trim(), password);
      if (firebaseUserCredential.user) {
        firebaseUserCredential.user.updateProfile({
          displayName: name
        });
        firebaseUserCredential.user.sendEmailVerification();
      }
    } catch (err) {
      setIsInvaild(true);
      setPassword('');
      setConfirmPass('');
      if (err.code === 'auth/email-already-in-use') {
        createToast({
          text: 'This email has already been registered!',
          type: 'danger'
        });
      } else if (err.code === 'auth/invalid-email') {
        createToast({
          text: 'Invalid email!',
          type: 'danger'
        });
      } else if (err.code === 'auth/weak-password') {
        createToast({
          text: 'Password too weak!',
          type: 'danger'
        });
      } else {
        console.log(err.code);
      }
    }
    setIsSigningUp(false);
  };


  return (
    <Container>
      <HeaderSignUp goBack={navigation.goBack}/>
      <Content style={styles.content}>
        <Text style={styles.heading}>Sign up</Text>
        <Text style={styles.subheading}>Sign up to join</Text>
        <InputBox
          value={email}
          setValue={setEmail}
          icon='mail'
          xIcon={true}
          placeholder='Email'
          setIsInvalid={setIsInvaild}
          isInvalid={isInvalid}
          autoCompleteType='email'
          disabled={isSigningUp}
        />
        <InputBox
          value={name}
          setValue={setName}
          icon='person'
          placeholder='Name'
          setIsInvalid={setIsInvaild}
          isInvalid={isInvalid}
          disabled={isSigningUp}
        />
        <InputBox
          value={password}
          setValue={setPassword}
          icon='ios-lock'
          placeholder='Password'
          setIsInvalid={setIsInvaild}
          isInvalid={isInvalid}
          secureTextEntry={true}
          disabled={isSigningUp}
        />
        <InputBox
          value={confirmPass}
          setValue={setConfirmPass}
          icon='ios-lock'
          placeholder='Confirm password'
          setIsInvalid={setIsInvaild}
          isInvalid={isInvalid}
          secureTextEntry={true}
          disabled={isSigningUp}
        />
        {isSigningUp ? <Spinner color='blue'/> : null}
        <LoginButton
          style={styles.button}
          buttonOnPress={signUp}
          buttonText='Sign up'
          text='Have an account?  '
          actionText='Sign in'
          actionTextOnPress={() => navigation.navigate('LoginHome')}
        />
      </Content>
    </Container>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingLeft: '7%',
    paddingRight: '7%',
    paddingTop: '5%'
  },
  heading: {
    fontSize: 50,
    fontFamily: 'sans-serif',
    color: colour.DARK_DARK_BLUE
  },
  subheading: {
    color: 'gray',
    fontFamily: 'sans-serif',
    marginBottom: '10%',
    marginTop: '3%'
  },
  button: {
    marginTop: '5%'
  }
});


export default SignupPage;