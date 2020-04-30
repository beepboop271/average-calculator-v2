import React from 'react';
import {Item, Input} from 'native-base';
import {StyleSheet} from 'react-native';

const InputBox = (props: {
  placeholder: string,
  value: string,
  autoFocus?: boolean,
  secureTextEntry?: boolean,
  autoCompleteType?: "username" | "password" | "name" | "cc-csc" | "cc-exp" | "cc-exp-month" | "cc-exp-year" | "cc-number" | "email" | "postal-code" | "street-address" | "tel" | "off" | undefined,
  setValue: React.Dispatch<React.SetStateAction<string>>
}): JSX.Element => {
  return (
    <Item rounded style={styles.item}>
      <Input 
        placeholder={props.placeholder}
        autoCompleteType={props.autoCompleteType}
        value={props.value}
        autoFocus={props.autoFocus}
        onChangeText={(text) => props.setValue(text)}
        onSubmitEditing={() => props.setValue('')}
        placeholderTextColor='#a9a9a9'
        secureTextEntry={props.secureTextEntry}
      />
    </Item>
  );
};

const styles = StyleSheet.create({
  item: {
    margin: '3%',
  }
});

export default InputBox;