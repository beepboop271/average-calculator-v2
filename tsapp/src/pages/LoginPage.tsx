import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';

import LoginHomePage from './LoginHomePage';
import SignUpPage from './SignUpPage';
import ForgotPasswordPage from './ForgotPasswordPage';

const Stack = createStackNavigator();
const LoginPage: React.FC = () => {

  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen 
        name='LoginHome'
        component={LoginHomePage}
      />
      <Stack.Screen 
        name='SignUp'
        component={SignUpPage}
      />
      <Stack.Screen 
        name='ForgotPassword'
        component={ForgotPasswordPage}
      />
    </Stack.Navigator>
  );
};


export default LoginPage;