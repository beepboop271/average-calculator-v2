import React, { useEffect, useContext, useState } from 'react';
import {View, StyleSheet} from 'react-native';
import {Container, Content, Text} from 'native-base';
import firestore from '@react-native-firebase/firestore';

import {UserContext} from '../utils/contexts';
import {getDate, updateUserCourseInfo} from '../utils/functions';
import Course from '../components/Course';
import SplashScreen from '../components/SplashScreen';

interface Props {
  navigation: any;
};

interface CourseInfo {
  name: string;
  period: string;
  courseCode: string;
  room: string;
  average: number;
};



const CoursesOverviewPage: React.FC<Props> = ({navigation}) => {
  const now = getDate();
  const {uid} = useContext(UserContext);
  if (!uid) return <SplashScreen/>;

  const [courses, setCourses] = useState<CourseInfo[]|null>(null);


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

  // const getAverage = async() => {
  //   if (courses) {
  //     await Promise.all(courses.map(async(course, index) => {

  //       const courseSnap = await firestore().collection('courses')
  //                             .where('courseCode', '==', course.courseCode)
  //                             .where('date', '==', now)
  //                             .get();
  //       if (courseSnap.size > 1) {
  //         throw new Error('duplicate courses');
  //       } else if (courseSnap.empty) {
  //         console.log(`cannot find course ${course.courseCode}`);
  //         return Promise.resolve();
  //       }

  //       const avgSnap = await firestore().collection('courses')
  //                         .doc(courseSnap.docs[0].id)
  //                         .collection('averages')
  //                         .where('userId', '==', uid)
  //                         .get();

  //       if (avgSnap.empty || avgSnap.size > 1) {
  //         throw new Error("can't find average snap");
  //       }

  //       const userSnap = await firestore().collection('users')
  //                               .where('uid', '==', uid)
  //                               .get();
        
  //       const precision = userSnap.docs[0].data().precision;
  //       const multiplyBy = Math.pow(10, precision); 
  //       const avg = avgSnap.docs[0].data().average;
  //       setCourses(courses => {
  //         if (courses) {
  //           courses[index].average = Math.round(avg*100*multiplyBy)/multiplyBy;
  //         }
  //         return courses;
  //       });
  //     }));
  //     console.log('retrieving avg finished');
  //   }
  // };

  useEffect(() => {
    updateUserCourseInfo(uid);
    getCourseInfo();
  }, []);

  if (!courses) {
    console.log('no courses');
    // return <Text>lsdfjslkfj</Text>
    return <SplashScreen/>
  }


  //get the courses
  const getCoursesCards = () => {
    return courses.map(course => (
      <Course
        name={course.name}
        courseCode={course.courseCode}
        period={course.period}
        room={course.room}
        average={course.average}
      />
    ));
  };

  return (
    <Content>
      {getCoursesCards()}
    </Content>
  );
};


export default CoursesOverviewPage;