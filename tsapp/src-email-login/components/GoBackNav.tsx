import React, {useContext} from 'react';
import {StyleSheet, StatusBar} from 'react-native';
import {Header, Icon, Text, Button} from 'native-base';

import {ThemeContext, ThemeColour} from '../utils/contexts';

interface Props {
  goBack: any;
  courseCode: string;
  average: string;
};

const GoBackNav: React.FC<Props> = ({goBack, courseCode, average}) => {
  const {mode, colour} = useContext(ThemeContext);
  const styles = getStyles(colour);

  return (
    <Header style={styles.header}>
      <StatusBar 
        backgroundColor={colour.statusBarBackground} 
        barStyle={mode === 'light' ? 'dark-content' : 'light-content'}/>
      <Button transparent onPress={goBack} style={styles.button}>
        <Icon name='ios-arrow-back' style={styles.icon}/>
        <Text style={styles.courseCode}>{courseCode}</Text>
      </Button>
      <Text style={styles.average}>{average}%</Text>
    </Header>
  );
};

const getStyles = (colour: ThemeColour) => {
  const styles = StyleSheet.create({
    header: {
      elevation: 10,
      backgroundColor: colour.header.background, 
      flexDirection: 'row'
    },
    button: {
      alignSelf: 'flex-start',
      marginRight: 'auto',
      marginTop: 'auto',
      marginBottom: 'auto'
    },
    icon: {
      fontSize: 20,
      color: colour.header.icon,
      fontFamily: 'sans-serif',
      alignSelf: 'center',
      marginRight: 0
    },
    courseCode: {
      fontFamily: 'sans-serif',
      marginRight: 'auto',
      alignSelf: 'center',
      fontSize: 19,
      color: colour.header.text
    },
    average: {
      fontFamily: 'sans-serif',
      marginLeft: 'auto',
      marginRight: 10,
      alignSelf: 'center',
      fontSize: 19,
      color: colour.header.text
    }
  });
  return styles;
};



export default GoBackNav;