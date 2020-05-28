import React, {useState, useEffect, useContext} from 'react';
import {Container, Content, Button, Text, Spinner} from 'native-base';
import {createStackNavigator} from '@react-navigation/stack';
import {UserContext} from '../utils/contexts';
import HeaderNav from '../components/HeaderNav';
import { StyleSheet, RefreshControl } from 'react-native';
import SplashScreen from '../components/SplashScreen';
import CoursesOverviewPage from './CoursesOverviewPage';
import DetailedAssessmentsPage from './DetailedAssessmentsPage';

interface Props {
  navigation: any;
};

const Stack = createStackNavigator();

const HomePage: React.FC<Props> = ({navigation}) => {

  const {uid} = useContext(UserContext);
  if (!uid) return <SplashScreen/>

  return (
    <Container>
        <Stack.Navigator screenOptions={{
          headerShown: false,
          gestureEnabled: true,
          gestureDirection: 'horizontal'
        }} initialRouteName='Overview'>
          <Stack.Screen
            name='Overview'
            component={CoursesOverviewPage}
          />
          <Stack.Screen 
            name='Detailed'
            component={DetailedAssessmentsPage}
          />
        </Stack.Navigator>

    </Container>
  );
};


const styles = StyleSheet.create({
  content: {
    height: 10
  },
  overview: {

  }
});

export default HomePage;