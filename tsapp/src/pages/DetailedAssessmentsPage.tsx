import React from 'react';
import { Container, Content } from 'native-base';



interface Props {
  navigation: any;
  route: any;
};

const DetailedAssessmentsPage: React.FC<Props> = ({navigation, route}) => {
  if (!route.params?.course) {
    throw new Error('course info not passed for assessments page');
  }

  return (
    <Container>
      <Content>

      </Content>
    </Container>
  );
};


export default DetailedAssessmentsPage;