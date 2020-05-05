import React, {useContext, useState} from 'react';
import {View, Icon, Text, Button, Spinner} from 'native-base';
import Modal from 'react-native-modal';
import { StyleSheet } from 'react-native';
import auth from '@react-native-firebase/auth';
import {UserContext} from '../utils/contexts';
import colour, { adobeAnalogousPastel, adobeAnalogousBlue, adobeMonochromaticBlue } from '../utils/colours';

interface Props {
  refresh: (setIsRefreshing: React.Dispatch<React.SetStateAction<boolean>>) => void;
};

const EmailConfirmationModal: React.FC<Props> = ({refresh}) => {
  
  const [cooldown, setCooldown] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const startCooldownTimer = () => {
    const cooldownTime = 20;

    setCooldown(cooldownTime);
    let i: number = cooldownTime;

    const id = setInterval(() => {
      setCooldown(i--);
      console.log(i);
    }, 1000);
    setTimeout(() => clearInterval(id), cooldownTime*1000+1000);
  };

  const sendLink = () => {
    const curUser = auth().currentUser;
    if (curUser) {
      curUser.sendEmailVerification();
      startCooldownTimer();
    } else {
      throw new Error('user signed in but not found?????');
    }
  };

  const signOut = () => {
    auth().signOut();
  };

  return (
    <View>
      <Modal 
        isVisible={true} 
        animationIn='zoomInDown' 
        animationOut='zoomOutUp'
        onBackButtonPress={signOut}
      >
        <View style={styles.content}>
          {!isRefreshing 
          ? <Icon 
              name='ios-refresh-circle' 
              style={styles.refresh} 
              onPress={() => refresh(setIsRefreshing)}/>
          : <Spinner 
              color={adobeAnalogousBlue.BLUE_VIOLET} 
              style={styles.refresh}/>
          }
          <View style={styles.bigTextWrapper}>
            <Text style={styles.oneMoreStep}>One more step...</Text>
            <Text style={styles.bigText}>Please verify your email</Text>
          </View>
          
          <Button transparent onPress={sendLink} disabled={cooldown>0}>
            <Text style={styles.resendLink}>
              Resend verification link {
                cooldown > 0 ? `in ${cooldown} s...` : null
              }
            </Text>
          </Button>
          
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  content: {
    flexDirection: 'column',
    backgroundColor: 'white',
    height: 170,
    justifyContent: 'center',
    alignContent: 'center',
    borderRadius: 10
  },
  oneMoreStep: {
    fontFamily: 'sans-serif',
    color: adobeMonochromaticBlue.GRAY,
    fontSize: 15
  },
  bigText: {
    fontSize: 25,
    fontFamily: 'sans-serif',
    color: adobeMonochromaticBlue.GRAY,
  },
  bigTextWrapper: {
    marginLeft: 'auto',
    marginRight: 'auto',
    flexDirection: 'column',
    flex: 2,
    marginTop: 10
  },
  resendLink: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'sans-serif',
    color: adobeAnalogousBlue.LIGHT_BLUE,
    textAlign: 'center'
  },
  refresh: {
    flex: 1,
    marginTop: 10,
    color: adobeAnalogousBlue.BLUE_VIOLET,
    textAlign: 'center',
    fontSize: 35
  }
});

export default EmailConfirmationModal;