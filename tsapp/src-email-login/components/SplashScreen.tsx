import React, {useContext} from 'react';
import {Container, Content, Spinner} from 'native-base';
import {ThemeContext} from '../utils/contexts';

const SplashScreen = () => {
  const {colour} = useContext(ThemeContext);
  return (
    <Container>
      <Content style={{backgroundColor: colour.background}}>
        <Spinner color='blue'/>
      </Content>
    </Container>
  );
};

export default SplashScreen;