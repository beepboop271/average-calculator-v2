import React, {useState, useEffect} from 'react';
import {Container, Header, Content, Form, Item, Button, Text, Spinner} from 'native-base';
import {StyleSheet, View} from 'react-native';
import InputBox from '../components/InputBox';
import axios from 'axios';

const TaCredentialsPage = (props: {
  uid: string|undefined
}) => {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  const updateTaCredentials = async () => {
    try {
      setIsUpdating(true);
      const res = await axios.post('https://us-central1-avg-calc.cloudfunctions.net/updateTaCredentials', {
        username: username,
        password: password,
        uid: props.uid,
      });
      console.log(res.data);
      setIsUpdating(false);
    } catch (err) {
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
            />

            <InputBox
              placeholder='Password'
              secureTextEntry={true}
              setValue={setPassword}
              value={password}
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