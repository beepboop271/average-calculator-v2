import React, {useState, useEffect} from 'react';
import {Container, Header, Content, Form, Button, Text, Spinner} from 'native-base';
import {StyleSheet, View} from 'react-native';
import axios from 'axios';


import InputBox from '../components/InputBox';
import {updateTaCredentials as updateTa, TaCredentials, errorCodes} from '../functions/functions';

interface Props {
  uid: string|undefined;
};

const TaCredentialsPage: React.FC<Props> = ({uid})  => {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [isInvalid, setIsInvalid] = useState<boolean>(false);

  const updateTaCredentials = async () => {
    try {
      setIsUpdating(true);
      setIsInvalid(false);
      const res = await updateTa({
        uid: uid,
        username: username,
        password: password
      } as TaCredentials);
      setUsername('');
      setPassword('');
      console.log(res);
      setIsUpdating(false);
      
    } catch (err) {
      if (err === errorCodes.INVALID_CREDENTIALS) {
        setIsUpdating(false);
        setIsInvalid(true);
        setPassword('');
      }
      console.log(err);
    } 
  };

  return (
    <Container>
      <Content>
        <View style={styles.content}>
          <Form>
            <InputBox
              placeholder='Username'
              setValue={setUsername}
              value={username}
              isInvalid={isInvalid}
              xIcon={true}
            />

            <InputBox
              placeholder='Password'
              secureTextEntry={true}
              setValue={setPassword}
              value={password}
              isInvalid={isInvalid}
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
    padding: '20%',
    paddingTop: '30%'
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