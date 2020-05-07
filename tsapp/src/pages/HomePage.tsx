import React, {useState, useEffect, useContext} from 'react';
import {Container, Content, Button, Text, Spinner} from 'native-base';
import {createStackNavigator} from '@react-navigation/stack';
import {UserContext} from '../utils/contexts';
import HeaderVav from '../components/HeaderNav';
import { StyleSheet } from 'react-native';
import SplashScreen from '../components/SplashScreen';
import CoursesOverviewPage from './CoursesOverviewPage';
import DetailedAssessmentsPage from './DetailedAssessmentsPage';

interface Props {
  navigation: any;
};

const Stack = createStackNavigator();

const HomePage: React.FC<Props> = ({navigation}) => {

  const {uid, name} = useContext(UserContext);
  if (!uid) return <SplashScreen/>

  return (
    <Container>
      <HeaderVav heading='Home' toggleDrawer={navigation.toggleDrawer}/>
      {/* <Content style={styles.content}> */}
        

        <Stack.Navigator screenOptions={{headerShown: false}}>
          <Stack.Screen
            name='Overview'
            component={CoursesOverviewPage}
          />
          <Stack.Screen 
            name='Detailed'
            component={DetailedAssessmentsPage}
          />

        </Stack.Navigator>
        <Button onPress={() => console.log(uid)}>
          <Text>hi {name} console.log(uid)</Text>
        </Button>

      {/* </Content> */}
    </Container>
  );
};


const styles = StyleSheet.create({
  content: {
    paddingTop: 0
  },
  overview: {

  }
});

export default HomePage;