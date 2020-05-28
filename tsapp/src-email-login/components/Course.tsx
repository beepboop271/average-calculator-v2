import React, {useContext} from 'react';
import {Text, Button, Icon} from 'native-base';
import { StyleSheet, View } from 'react-native';
import {ThemeContext, ThemeColour} from '../utils/contexts';
import { TouchableOpacity } from 'react-native-gesture-handler';

interface Props {
  name: string;
  courseCode: string;
  room: string;
  average: string;
  navigate: (courseCode: string) => void;
};

const Course: React.FC<Props> = ({
  name,
  courseCode,
  room,
  average,
  navigate,
}) => {
  const {colour} = useContext(ThemeContext);
  const styles = getStyles(colour);
  

  return (
    <TouchableOpacity 
      onPress={() => navigate(courseCode)}
      disabled={average === 'NaN'}
      activeOpacity={0.5}
    >
      <View style={[styles.wrapper, {opacity: average === 'NaN' ? 0.3 : 1}]}>
        <View style={styles.description}>
          <Text style={styles.courseCode}>{courseCode}</Text>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.room}>{room}</Text>
        </View>
        <View style={styles.average}>
          <Text style={styles.percent}>
            {average === 'NaN' ? 'N/A' : `${average}%`}
          </Text>
          <Icon name='ios-arrow-forward' style={styles.arrow}/>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const getStyles = (colour: ThemeColour) => {
  const styles = StyleSheet.create({
    wrapper: {
      marginLeft: 15,
      marginRight: 15,
      marginTop: 5,
      height: 120,
      borderRadius: 10,
      borderWidth: 1.5,
      flexDirection: 'row',
      borderColor: colour.courseCard.border,
      backgroundColor: colour.courseCard.background,
      padding: 20
    },
    description: {
      flex: 1.6,
      alignSelf: 'center'
    },
    courseCode: {
      fontFamily: 'sans-serif',
      fontWeight: 'bold',
      fontSize: 18,
      color: colour.courseCard.courseCode,
    },
    name: {
      fontFamily: 'sans-serif',
      fontSize: 15,
      color: colour.courseCard.otherInfo,
    },
    room: {
      fontFamily: 'sans-serif',
      color: colour.courseCard.otherInfo,
      fontSize: 12
    },
    average: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 'auto',
    },
    percent: {
      color: colour.courseCard.percent,
      fontSize: 20,
      marginLeft: 'auto',
      fontFamily: 'sans-serif-condensed',
      fontWeight: 'bold',
    },
    arrow: {
      marginRight: 20,
      marginLeft: 8,
      fontSize: 20,
      alignSelf: 'center',
      color: colour.courseCard.border
    }
  });
  return styles;
};

export default Course;