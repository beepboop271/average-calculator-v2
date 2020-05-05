import React, { useState } from 'react';
import {Container, Content, Text, Spinner} from 'native-base';
import { StyleSheet } from 'react-native';
import auth from '@react-native-firebase/auth';

import InputBox from '../components/InputBox';
import HeaderSignUp from '../components/HeaderSignUp';
import LoginButton from '../components/LoginButton';
import {colour} from '../utils/colours';
import {createToast} from '../utils/toast';

interface Props {
  navigation: any;
};

const ForgotPasswordPage: React.FC<Props> = ({navigation}) => {
  const [email, setEmail] = useState<string>('');
  const [cooldown, setCooldown] = useState<number>(0);
  const [isInvalid, setIsInvalid] = useState<boolean>(false);
  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false);

  const sendResetPasswordLink = async () => {
    setIsSendingEmail(true);
    if (email === '') {
      createToast({
        text: 'Please enter an email',
        type: 'warning'
      });
      setIsSendingEmail(false);
      return;
    }


    try {
      await auth().sendPasswordResetEmail(email.trim());
      startCooldownTimer();
    } catch (err) {
      setIsInvalid(true);
      if (err.code === 'auth/invalid-email') {
        createToast({
          text: 'Invalid email',
          type: 'danger'
        });
      } else if (err.code === 'auth/user-not-found') {
        createToast({
          text: 'User not found',
          type: 'danger'
        });
      } else {
        console.log(err);
      }
    }
    setIsSendingEmail(false);
  };

  const startCooldownTimer = () => {
    const seconds: number = 20;
    let i: number = seconds;
    setCooldown(seconds);
    const id: number = setInterval(() => {
      setCooldown(i--);
    }, 1000);
    setTimeout(() => clearInterval(id), seconds*1000+1000);
  };


  const buttonProps = {
    disabled: cooldown > 0
  };

  const buttonText = () => {
    if (cooldown > 0) {
      return `Resend link in ${cooldown}...`;
    }
    return 'Reset password';
  };


  return (
    <Container>
      <HeaderSignUp goBack={navigation.goBack}/>
      <Content style={styles.content}>
        <Text style={styles.heading}>Forgot Password?</Text>
        <Text style={styles.subheading}>A password reset link will be sent to the email entered:</Text>

        <InputBox 
          value={email}
          setValue={setEmail}
          xIcon={true}
          isInvalid={isInvalid}
          setIsInvalid={setIsInvalid}
          disabled={isSendingEmail}
          placeholder='Email'
          icon='mail'
        />
        {isSendingEmail ? <Spinner color='blue'/> : null}
        <LoginButton
          buttonText={buttonText()}
          buttonOnPress={sendResetPasswordLink}
          buttonProps={buttonProps}
        />
      </Content>
    </Container>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: '8%',
  },
  heading: {
    fontSize: 50,
    fontFamily: 'sans-serif',
    color: colour.DARK_DARK_BLUE,
    
  },
  subheading: {
    fontSize: 15,
    fontFamily: 'sans-serif',
    color: 'gray',
    marginBottom: 25
  }
});


export default ForgotPasswordPage;