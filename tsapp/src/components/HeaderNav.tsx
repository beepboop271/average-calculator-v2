import React from 'react';
import {StyleSheet, StatusBar} from 'react-native';
import {Header, Icon, Text, Button} from 'native-base';

import {colour} from '../utils/colours';

interface Props {
  toggleDrawer: any;
  heading: string;
};

const HeaderNav: React.FC<Props> = ({toggleDrawer, heading}) => {
  return (
    <Header style={styles.header}>
      <StatusBar backgroundColor={colour.LIGHT_GRAY} barStyle="dark-content"/>
      <Button transparent onPress={toggleDrawer}>
        <Icon name='menu' style={styles.icon}/>
      </Button>
      
      <Text style={styles.heading}>{heading}</Text>
    </Header>
  );
};


const styles = StyleSheet.create({
  header: {
    elevation: 5,
    backgroundColor: colour.LIGHT_GRAY, 
  },
  heading: {
    fontSize: 18,
    alignSelf: 'center',
    textAlign: 'center',
    marginLeft: 'auto',
    marginRight: 'auto',
    paddingRight: '9%', //constant to balance out the menu icon spacing
    zIndex: -1
  },
  icon: {
    marginRight: 'auto',
    marginLeft: '1%',
    alignSelf: 'center',
    fontSize: 30,
    color: colour.DARK_GRAY,
  }
});

export default HeaderNav;