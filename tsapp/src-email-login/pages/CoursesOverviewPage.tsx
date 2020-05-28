import React, {useEffect, useContext, useState} from 'react';
import {View, StyleSheet, RefreshControl} from 'react-native';
import {Container, Content, Text} from 'native-base';
import firestore from '@react-native-firebase/firestore';

import {UserContext, ThemeContext, ThemeColour} from '../utils/contexts';
import {getDate, updateUserCourseInfo, getUserSnap} from '../utils/functions';
import Course from '../components/Course';
import SplashScreen from '../components/SplashScreen';
import HeaderNav from '../components/HeaderNav';

interface Props {
  navigation: any;
}

interface CourseInfo {
  name: string;
  courseCode: string;
  room: string;
  average: string;
}

const CoursesOverviewPage: React.FC<Props> = ({navigation}) => {
  const now = getDate();
  const {uid, name, precision} = useContext(UserContext);
  console.log(uid);
  if (!uid) return <SplashScreen />;

  const {colour} = useContext(ThemeContext);
  const styles = getStyles(colour);

  const [courses, setCourses] = useState<CourseInfo[] | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const getCourseInfo = async () => {
    const userSnap = await getUserSnap(uid);

    const coursesSnap = await firestore()
      .collection('users')
      .doc(userSnap.id)
      .collection('courses')
      .where('date', '==', now)
      .orderBy('period')
      .get();
    if (!coursesSnap.empty) {
      const courses = coursesSnap.docs.map((snap) => snap.data());

      const coursesInfo: CourseInfo[] = courses.map((course) => {
        course.average = (course.average * 100).toFixed(precision);
        return course as CourseInfo;
      });
      setCourses(coursesInfo);
    }
  };

  const refresh = async (): Promise<void> => {
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

  //get the courses
  const getCoursesCards = () => {
    if (!courses) {
      console.log('no courses');
      return undefined;
    }
    return courses.map((course) => (
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
      <HeaderNav
        heading={name || 'Home'}
        toggleDrawer={navigation.toggleDrawer}
      />
      <Content
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            colors={[colour.refresh]}
          />
        }>
        <View style={styles.dropShadow}></View>
        {getCoursesCards()}
      </Content>
    </Container>
  );
};

const getStyles = (colour: ThemeColour) => {
  const styles = StyleSheet.create({
    content: {
      backgroundColor: colour.background,
    },
    dropShadow: {
      elevation: 5,
      backgroundColor: colour.header.dropShadow,
      height: 1,
      marginBottom: 20,
    },
  });
  return styles;
};

export default CoursesOverviewPage;
