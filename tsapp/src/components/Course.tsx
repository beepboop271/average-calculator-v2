import React from 'react';
import {Text, Button, Icon} from 'native-base';
import { StyleSheet, View } from 'react-native';
import { adobeAnalogousBlue, colour, adobeMonochromaticBlue, adobeAnalogousPastel } from '../utils/colours';


interface Props {
  name: string;
  courseCode: string;
  room: string;
  average: number;
  navigate: (courseCode: string) => void;
};

const Course: React.FC<Props> = ({
  name,
  courseCode,
  room,
  average,
  navigate,
}) => {
  return (
    <Button 
      bordered 
      style={styles.wrapper} 
      onPress={() => navigate(courseCode)}
      disabled={isNaN(average)}
    >
        <View style={styles.description}>
          <Text style={styles.courseCode}>{courseCode}</Text>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.room}>{room}</Text>
        </View>
        <View style={styles.average}>
          <Text style={styles.percent}>{average}%</Text>
          <Icon name='ios-arrow-forward' style={styles.arrow}/>
        </View>
      
    </Button>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginLeft: 15,
    marginRight: 15,
    marginTop: 5,
    height: 120,
    borderRadius: 10,
    flexDirection: 'row',
    borderColor: adobeMonochromaticBlue.LIGHT_BLUE,
  },
  description: {
    flex: 1.6
  },
  courseCode: {
    fontFamily: 'sans-serif',
    fontWeight: 'bold',
    fontSize: 18,
  },
  name: {
    fontFamily: 'sans-serif',
    fontSize: 15,
    color: adobeAnalogousBlue.LIGHT_BLUE
  },
  room: {
    fontFamily: 'sans-serif',
    color: adobeAnalogousBlue.LIGHT_BLUE,
    fontSize: 12
  },
  average: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  percent: {
    color: adobeAnalogousPastel.BLUE,
    fontSize: 20,
    marginLeft: 'auto',
    fontFamily: 'sans-serif-condensed',
    fontWeight: 'bold',
  },
  arrow: {
    marginRight: 25,
    marginLeft: 0,
    fontSize: 20,
    alignSelf: 'center',
    color: adobeMonochromaticBlue.LIGHT_BLUE
  }
});

export default Course;