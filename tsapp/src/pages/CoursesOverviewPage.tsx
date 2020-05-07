import React, { useEffect, useContext, useState } from 'react';
import {View, StyleSheet, RefreshControl} from 'react-native';
import {Container, Content, Text} from 'native-base';
import firestore from '@react-native-firebase/firestore';

import {UserContext} from '../utils/contexts';
import {getDate, updateUserCourseInfo} from '../utils/functions';
import Course from '../components/Course';
import SplashScreen from '../components/SplashScreen';
import HeaderNav from '../components/HeaderNav';
import {colour, adobeAnalogousBlue, adobeMonochromaticBlue} from '../utils/colours';

interface Props {
  navigation: any;
};

interface CourseInfo {
  name: string;
  courseCode: string;
  room: string;
  average: number;
};



const CoursesOverviewPage: React.FC<Props> = ({navigation}) => {
  const now = getDate();
  const {uid} = useContext(UserContext);
  if (!uid) return <SplashScreen/>;

  const [courses, setCourses] = useState<CourseInfo[]|null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);


  const getCourseInfo = async() => {

    const userSnap = await firestore().collection('users')
                                .where('uid', '==', uid)
                                .get();
    if (userSnap.size > 1 || userSnap.empty) {
      throw new Error('multiple or 0 users found');
    }

    const coursesSnap = await firestore().collection('users')
                                         .doc(userSnap.docs[0].id)
                                         .collection('courses')
                                         .where('date', '==', now)
                                         .orderBy('period')
                                         .get();
    if (!coursesSnap.empty) {
      let courses = coursesSnap.docs.map(snap => snap.data() as CourseInfo);
      const multiplyBy = Math.pow(10, userSnap.docs[0].data().precision);

      courses = courses.map(course => {
        course.average = Math.round(course.average*100*multiplyBy)/multiplyBy;
        return course;
      });
      setCourses(courses);
    }
  };

  const refresh = async() => {
    setRefreshing(true);
    await updateUserCourseInfo(uid);
    await getCourseInfo();
    setRefreshing(false);
  };

  const navigate = (courseCode: string) => {
    navigation.navigate('Detailed', {courseCode: courseCode});
  };

  useEffect(() => {
    updateUserCourseInfo(uid);
    getCourseInfo();
  }, []);

  if (!courses) {
    console.log('no courses');
    return <SplashScreen/>
  }


  //get the courses
  const getCoursesCards = () => {
    return courses.map(course => (
      <Course
        name={course.name}
        courseCode={course.courseCode}
        navigate={navigate}
        room={course.room}
        average={course.average}
      />
    ));
  };

  return (
    <Container>
      <HeaderNav heading='Home' toggleDrawer={navigation.toggleDrawer}/>
      <Content style={styles.content} refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={refresh} 
          colors={[adobeAnalogousBlue.BLUE_VIOLET]}/>
      }>
        <View style={styles.dropShadow}></View>
        {getCoursesCards()}
      </Content>
    </Container>
    
  );
};

const styles = StyleSheet.create({
  content: {
    backgroundColor: colour.LIGHT_LIGHT_GRAY,
  },
  dropShadow: {
    elevation: 5,
    backgroundColor: colour.LIGHT_GRAY,
    height: 1,
    marginBottom: 20
  }
});

export default CoursesOverviewPage;