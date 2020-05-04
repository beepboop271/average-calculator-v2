import React from 'react';
import {StyleSheet, StatusBar} from 'react-native';
import {Header, Icon, Text, Button} from 'native-base';

import {colour} from '../utils/colours';

interface Props {
  goBack: any;
};

const HeaderSignUp: React.FC<Props> = ({goBack}) => {
  return (
    <Header style={styles.header}>
      <StatusBar backgroundColor={colour.LIGHT_GRAY} barStyle="dark-content"/>
      <Button transparent onPress={goBack} style={styles.button}>
        <Icon name='ios-arrow-back' style={styles.icon}/>
        <Text style={styles.back}>Back</Text>
      </Button>
    </Header>
  );
};


const styles = StyleSheet.create({
  header: {
    elevation: 5,
    backgroundColor: colour.LIGHT_GRAY, 
    flexDirection: 'row'
  },
  button: {
    alignSelf: 'flex-start',
    marginRight: 'auto'
  },
  back: {
    fontSize: 15,
    color: 'gray',
    fontFamily: 'sans-serif',
    alignSelf: 'flex-end',
    paddingLeft: 10
  },
  icon: {
    fontSize: 20,
    color: colour.DARK_GRAY,
    fontFamily: 'sans-serif',
    alignSelf: 'flex-end',
    marginRight: 0
  }
});

export default HeaderSignUp;