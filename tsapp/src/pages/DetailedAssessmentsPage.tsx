import React from 'react';
import { Container, Content } from 'native-base';



interface Props {
  navigation: any;
  route: any;
};

const DetailedAssessmentsPage: React.FC<Props> = ({navigation, route}) => {
  if (!route.params?.courseCode) {
    throw new Error('course info not passed for assessments page');
  }
  console.log(route.params.courseCode);

  return (
    <Container>
      <Content>

      </Content>
    </Container>
  );
};


export default DetailedAssessmentsPage;