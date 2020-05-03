import React, {useContext} from 'react';
import {Image, StyleSheet, View} from 'react-native';
import {
  DrawerContentScrollView, 
  DrawerItem,
  DrawerContentComponentProps,
  DrawerContentOptions
} from '@react-navigation/drawer';
import {Icon, Text} from 'native-base';
import auth from '@react-native-firebase/auth';

import {UserContext} from '../utils/contexts';
import { GoogleSignin } from '@react-native-community/google-signin';

//this was one long component
const SideBar: React.FC<DrawerContentComponentProps<DrawerContentOptions>> = (props) => {

  //signing out
  const {setLoggedIn} = useContext(UserContext);
  if (!setLoggedIn) throw new Error('no provider for setLoggedIn in sidebar');

  const signOut = async() => {
    try {
      await GoogleSignin.revokeAccess();
      await GoogleSignin.signOut();
      await auth().signOut();
      setLoggedIn(false);
    } catch (err) {
      console.log(err);
    }
  };


  const curRoute = props.state.routes[props.state.index].name;

  return (
    <DrawerContentScrollView {...props}>
      <Image 
        source={require('../assets/logo.png')}
        style={styles.logo}
      />
      <Text style={styles.line}>_______________</Text>
      <DrawerItem 
        label='Home' 
        icon={() => <Icon name='home'/>}
        focused={curRoute === 'Home'}
        onPress={() => props.navigation.navigate('Home')}
      />
      <DrawerItem
        label='Profile'
        icon={() => <Icon name='person'/>}
        focused={curRoute === 'UpdateTa'}
        onPress={() => props.navigation.navigate('UpdateTa')}
      />
      <DrawerItem
        label='Logout'
        icon={() => <Icon name='log-out'/>}
        focused={curRoute === 'Logout'}
        onPress={() => {
          props.navigation.navigate('Logout');
          props.navigation.openDrawer(); //idk why this shows error but it works so...
          signOut();
        }}
      />
    </DrawerContentScrollView>
  );

};

const styles = StyleSheet.create({
  logo: {
    width: 100,
    height: 100,
    alignSelf: 'center',
    marginTop: 40,
    marginBottom: 30
  },
  line: {
    height: 2,
    alignSelf: 'center',
    borderBottomColor: 'gray',
    borderBottomWidth: 2,
    borderRadius: 20,
    marginBottom: 5,
    marginTop: 3
  }

});


export default SideBar;