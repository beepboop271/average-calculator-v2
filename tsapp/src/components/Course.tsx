import React from 'react';
import {Card, Text} from 'native-base';
import { StyleSheet } from 'react-native';


interface Props {
  name: string;
  courseCode: string;
  period: string;
  room: string;
  average: number;
};

const Course: React.FC<Props> = ({
  period,
  name,
  courseCode,
  room,
  average
}) => {
  return (
    <Card>
      <Text>
        {`${period}, ${name}, ${courseCode}, ${room}, ${average}`}
      </Text>
    </Card>
  );
};

const styles = StyleSheet.create({

});

export default Course;