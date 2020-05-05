import React from 'react';
import {Container, Content, Spinner} from 'native-base';

const SplashScreen = () => {
  return (
    <Container>
      <Content>
        <Spinner color='blue'/>
      </Content>
    </Container>
  );
};

export default SplashScreen;