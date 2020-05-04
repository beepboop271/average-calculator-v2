import React, {useState} from 'react';
import {View} from 'react-native';
import {Item, Input, Icon, InputGroup} from 'native-base';
import {StyleSheet} from 'react-native';


import colours from '../utils/colours';

interface Props {
  icon: string;
  placeholder: string;
  value: string;
  autoFocus?: boolean;
  secureTextEntry?: boolean;
  autoCompleteType?: "username" | "password" | "name" | "cc-csc" | "cc-exp" | "cc-exp-month" | "cc-exp-year" | "cc-number" | "email" | "postal-code" | "street-address" | "tel" | "off" | undefined;
  setValue: React.Dispatch<React.SetStateAction<string>>;
  setIsInvalid: React.Dispatch<React.SetStateAction<boolean>>;
  isInvalid: boolean;
  xIcon?: boolean;
  isSuccess?: boolean;
  disabled: boolean;
};


const InputBox: React.FC<Props> = ({
  icon,
  placeholder,
  autoCompleteType,
  value,
  autoFocus,
  setValue,
  secureTextEntry,
  isInvalid,
  setIsInvalid,
  xIcon,
  isSuccess,
  disabled
}) => {

  const xIconPressed = () => {
    setValue('');
    setIsInvalid(false);
  };

  return (
    <Item underline style={styles.item}>
      <InputGroup error={isInvalid} success={isSuccess}>
        <Icon name={icon} style={styles.icon}/>
        <Input 
          placeholder={placeholder}
          autoCompleteType={autoCompleteType}
          value={value}
          autoFocus={autoFocus}
          onChangeText={(text) => setValue(text)}
          onSubmitEditing={() => setValue('')}
          placeholderTextColor='#a9a9a9'
          secureTextEntry={secureTextEntry}
          style={{fontFamily: 'sans-serif-light'}}
          disabled={disabled}
        />
        {isInvalid && value !== '' && xIcon
        ? <Icon name='close-circle' onPress={xIconPressed}/> 
        : null}
        {isSuccess ? <Icon name='check-mark-circle-outline'/> : null}
      </InputGroup>
    </Item>
    
  );
};


const styles = StyleSheet.create({
  item: {
    margin: '3%'
  },
  icon: {
    color: colours.DARK_GRAY,
    width: 30,
    textAlign: 'center'
  }
});

export default InputBox;