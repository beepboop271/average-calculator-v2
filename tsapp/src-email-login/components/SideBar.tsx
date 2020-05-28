import React, {useContext} from 'react';
import {Image, StyleSheet, View} from 'react-native';
import {
  DrawerContentScrollView,
  DrawerItem,
  DrawerContentComponentProps,
  DrawerContentOptions,
} from '@react-navigation/drawer';
import {Icon, Text} from 'native-base';
import auth from '@react-native-firebase/auth';

import {UserContext, ThemeColour} from '../utils/contexts';
import {ThemeContext} from '../utils/contexts';
import {setDBLoggedIn} from '../utils/functions';
import SplashScreen from './SplashScreen';
import {GoogleSignin} from '@react-native-community/google-signin';

//this was one long component
const SideBar: React.FC<DrawerContentComponentProps<DrawerContentOptions>> = (
  props,
) => {
  //signing out
  const {setLoggedIn, uid} = useContext(UserContext);
  if (!setLoggedIn || !uid) return <SplashScreen />;

  const {colour} = useContext(ThemeContext);
  const styles = getStyles(colour);

  const signOut = async () => {
    try {
      if (await GoogleSignin.isSignedIn) {
        await GoogleSignin.signOut();
      }
      await setDBLoggedIn({uid: uid, loggedIn: false});
      await auth().signOut();
      setLoggedIn(false);
    } catch (err) {
      console.log(err);
    }
  };

  const curRoute = props.state.routes[props.state.index].name;

  const colourProps = {
    activeTintColor: colour.sidebar.activeText,
    inactiveTintColor: colour.sidebar.inactiveText,
    activeBackgroundColor: colour.sidebar.activeBackground,
    inactiveBackgroundColor: colour.sidebar.inactiveBackground,
  };

  return (
    <DrawerContentScrollView style={styles.content} {...props}>
      <Image source={require('../assets/logo.png')} style={styles.logo} />
      <Text style={styles.line}>_______________</Text>
      <DrawerItem
        {...colourProps}
        label="Home"
        icon={() => <Icon style={styles.icon} type="AntDesign" name="home" />}
        focused={curRoute === 'Home'}
        onPress={() => props.navigation.navigate('Home')}
      />
      <DrawerItem
        {...colourProps}
        label="Settings"
        icon={() => <Icon style={styles.icon} type="Feather" name="settings" />}
        focused={curRoute === 'Settings'}
        onPress={() => props.navigation.navigate('Settings')}
      />
      <DrawerItem
        {...colourProps}
        label="UpdateTA"
        icon={() => <Icon style={styles.icon} type="Feather" name="settings" />}
        focused={curRoute === 'UpdateTa'}
        onPress={() => props.navigation.navigate('UpdateTa')}
      />
      <DrawerItem
        {...colourProps}
        label="Logout"
        icon={() => <Icon style={styles.icon} name="log-out" />}
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

const getStyles = (colour: ThemeColour) => {
  const styles = StyleSheet.create({
    content: {
      backgroundColor: colour.background,
    },
    logo: {
      width: 100,
      height: 100,
      alignSelf: 'center',
      marginTop: 40,
      marginBottom: 30,
    },
    line: {
      height: 2,
      alignSelf: 'center',
      borderBottomColor: 'gray',
      borderBottomWidth: 2,
      borderRadius: 20,
      marginBottom: 5,
      marginTop: 3,
    },
    icon: {
      textAlign: 'center',
      alignSelf: 'center',
      fontSize: 23,
      marginLeft: 5,
      flex: 0.2,
      color: colour.sidebar.icon,
    },
  });
  return styles;
};

export default SideBar;
