import React, {useContext} from 'react';
import {View, StyleSheet} from 'react-native';
import Modal from 'react-native-modal';
import {Spinner, Text} from 'native-base';


import {UserContext} from '../utils/contexts';


const Logout: React.FC = () => {
  const {isLoggedIn} = useContext(UserContext);

  return (
    <View>
      <Modal 
        isVisible={isLoggedIn} 
        animationIn='zoomInDown' 
        animationOut='zoomOutUp'
      >
        <View style={styles.content}>
          <Spinner style={styles.spinner}/>
          {/* <Text style={styles.text}>Logging out...</Text> */}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  content: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 5
  },
  spinner: {
    flex: 1,
    marginRight: 'auto',
    marginLeft: 'auto'
  },
  // text: {
  //   marginRight: 'auto',
  //   flex: 3
  // }
});

export default Logout;