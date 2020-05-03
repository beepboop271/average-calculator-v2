import React, {useState, useEffect, useContext} from 'react';
import {Container, Content, Button, Text, Spinner} from 'native-base';
import {UserContext} from '../utils/contexts';
import HeaderVav from '../components/HeaderNav';
import { StyleSheet } from 'react-native';
import SplashScreen from '../components/SplashScreen';

interface Props {
  navigation: any;
};


const HomePage: React.FC<Props> = ({navigation}) => {

  const {uid} = useContext(UserContext);
  if (!uid) return <SplashScreen/>

  return (
    <Container>
      <HeaderVav heading='Home' toggleDrawer={navigation.toggleDrawer}/>
      <Content style={styles.content}>
        <Button onPress={() => console.log(uid)}>
          <Text>console.log(uid)</Text>
        </Button>
      </Content>
    </Container>
  );
};


const styles = StyleSheet.create({
  content: {
    paddingTop: 'auto'
  },
});

export default HomePage;