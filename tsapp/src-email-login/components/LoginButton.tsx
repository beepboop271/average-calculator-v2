import React, {useContext} from 'react';
import {View, Text, Button} from 'native-base';
import { StyleSheet } from 'react-native';
import {ThemeContext, ThemeColour} from '../utils/contexts';
import {adobeAnalogousBlue} from '../utils/colours';

interface Props {
  buttonOnPress: () => void;
  actionTextOnPress?: () => void;
  buttonText: string;
  text?: string;
  actionText?: string;
  style?: {};
  buttonProps?: {};
};

const LoginButton: React.FC<Props> = ({
  buttonOnPress,
  actionTextOnPress,
  buttonText,
  text,
  actionText,
  style,
  buttonProps
}) => {
  const {colour} = useContext(ThemeContext);
  const styles = getStyles(colour);
  

  return (
    <View style={style}>
      <Button rounded style={styles.button} onPress={buttonOnPress} {...buttonProps}>
        <Text style={styles.buttonText}>{buttonText}</Text>
      </Button>
      <View style={styles.textWrapper}>
        <Text style={styles.text}>{text}</Text>
        <Text 
          style={styles.actionText}
          onPress={actionTextOnPress}
        >{actionText}</Text>
      </View>
    </View>
  );
};

const getStyles = (colour: ThemeColour) => {
  const styles = StyleSheet.create({
    button: {
      width: '100%',
      marginTop: '5%',
      elevation: 7,
      height: 50,
      backgroundColor: colour.button.background
    },
    buttonText: {
      textAlign: 'center',
      fontSize: 20,
      width: '100%',
      fontFamily: 'sans-serif-medium',
      color: colour.button.text
    },
    textWrapper: {
      flexDirection: 'row',
      marginTop: '3%'
    },
    text: {
      fontSize: 12,
      marginLeft: 'auto',
      alignSelf: 'flex-end',
      fontFamily: 'sans-serif-light'
    },
    actionText: {
      fontSize: 15,
      color: adobeAnalogousBlue.VIOLET,
      marginRight: 'auto',
      fontFamily: 'sans-serif-light'
    },
  });
  return styles;
};

export default LoginButton;