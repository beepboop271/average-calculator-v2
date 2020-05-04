import React, {useState, useEffect, useContext} from 'react';
import {Container, Content, Form, Button, Text, Spinner, Toast} from 'native-base';
import {StyleSheet, View} from 'react-native';

import InputBox from '../components/InputBox';
import HeaderVav from '../components/HeaderNav';
import SplashScreen from '../components/SplashScreen';
import {UserContext} from '../utils/contexts';
import {createToast} from '../utils/toast';
import {updateTaCredentials as updateTa, errorCodes} from '../utils/functions';

interface Props {
  navigation: any;
};


const TaCredentialsPage: React.FC<Props> = ({navigation})  => {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [isInvalid, setIsInvalid] = useState<boolean>(false);


  const {uid} = useContext(UserContext);
  if (!uid) return <SplashScreen/>


  const updateTaCredentials = async () => {
    try {
      setIsUpdating(true);
      setIsInvalid(false);
      const res = await updateTa({
        uid: uid,
        username: username,
        password: password
      });
      setUsername('');
      setPassword('');
      console.log(res);
      setIsUpdating(false);

      //hehe res is string whereas error code is int so I didn't use !==
      if (res != errorCodes.INVALID_CREDENTIALS) {
        createToast({
          text: 'Successfully updated!',
          type: 'success'
        });
      }
      
    } catch (err) {
      if (err === errorCodes.INVALID_CREDENTIALS) {
        setIsUpdating(false);
        setIsInvalid(true);
        setPassword('');
        createToast({
          text: 'Invalid username or password!',
          type: 'danger'
        });
      }
      console.log(err);
    } 
  };

  return (
    <Container>
      <HeaderVav heading='Update TA info' toggleDrawer={navigation.toggleDrawer}/>
      <Content>
        <View style={styles.content}>
          <Form>
            <InputBox
              icon='md-person'
              placeholder='Username'
              setValue={setUsername}
              value={username}
              isInvalid={isInvalid}
              setIsInvalid={setIsInvalid}
              xIcon={true}
              disabled={isUpdating}
            />

            <InputBox
              icon='lock'
              placeholder='Password'
              secureTextEntry={true}
              setValue={setPassword}
              value={password}
              isInvalid={isInvalid}
              setIsInvalid={setIsInvalid}
              disabled={isUpdating}
            />
            {isUpdating ? <Spinner/> : null}
            <Button 
              bordered 
              style={styles.button}
              onPress={updateTaCredentials}
            >
              <Text style={styles.buttonText}>Update</Text>
            </Button>
          </Form>
        </View>
      </Content>
    </Container>
  );
};


const styles = StyleSheet.create({
  content: {
    padding: '15%',
    paddingTop: '25%'
  },
  button: {
    marginRight: 'auto',
    marginLeft: 'auto',
    marginTop: '20%',
    width: '60%'
  },
  buttonText: {
    marginLeft: 'auto',
    marginRight: 'auto',
    fontSize: 15
  }
});

export default TaCredentialsPage;