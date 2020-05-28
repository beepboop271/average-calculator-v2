import React, {useContext} from 'react';
import {StyleSheet, StatusBar} from 'react-native';
import {Header, Icon, Text, Button} from 'native-base';

import {ThemeContext, ThemeColour} from '../utils/contexts'

interface Props {
  toggleDrawer: any;
  heading: string;
};

const HeaderNav: React.FC<Props> = ({toggleDrawer, heading}) => {
  const {mode, colour} = useContext(ThemeContext);
  

  const styles = getStyles(colour);

  return (
    <Header style={styles.header}>
      <StatusBar 
        backgroundColor={colour.statusBarBackground} 
        barStyle={mode === 'light' ? 'dark-content' : 'light-content'}/>
      <Button transparent onPress={toggleDrawer}>
        <Icon name='menu' style={styles.icon}/>
      </Button>
      
      <Text style={styles.heading}>{heading}</Text>
    </Header>
  );
  
};

const getStyles = (colour: ThemeColour) => {
  const styles = StyleSheet.create({
    header: {
      elevation: 5,
      backgroundColor: colour.header.background, 
    },
    heading: {
      fontSize: 18,
      alignSelf: 'center',
      textAlign: 'center',
      marginLeft: 'auto',
      marginRight: 'auto',
      paddingRight: '9%', //constant to balance out the menu icon spacing
      zIndex: -1,
      color: colour.header.text
    },
    icon: {
      marginRight: 'auto',
      marginLeft: '1%',
      alignSelf: 'center',
      fontSize: 30,
      color: colour.header.icon,
    }
  });
  return styles;
};


export default HeaderNav;