import React, {useContext} from 'react';
import {View, StyleSheet} from 'react-native';
import Modal from 'react-native-modal';
import {Spinner} from 'native-base';


import {UserContext} from '../utils/contexts';


const Logout: React.FC = () => {
  const {isLoggedIn} = useContext(UserContext);

  return (
    <View>
      <Modal isVisible={isLoggedIn}>
        <View style={styles.content}>
          <Spinner style={styles.spinner}/>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  content: {
    flexDirection: 'row',
    backgroundColor: 'white',
  },
  spinner: {
    flex: 1,
    marginRight: 'auto',
    marginLeft: 'auto'
  }
});

export default Logout;