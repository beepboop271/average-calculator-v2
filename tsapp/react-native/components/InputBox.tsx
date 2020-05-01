import React, {useState} from 'react';
import {Item, Input, Icon} from 'native-base';
import {StyleSheet} from 'react-native';


interface Props {
  placeholder: string;
  value: string;
  autoFocus?: boolean;
  secureTextEntry?: boolean;
  autoCompleteType?: "username" | "password" | "name" | "cc-csc" | "cc-exp" | "cc-exp-month" | "cc-exp-year" | "cc-number" | "email" | "postal-code" | "street-address" | "tel" | "off" | undefined;
  setValue: React.Dispatch<React.SetStateAction<string>>;
  isInvalid: boolean;
  xIcon?: boolean;
};


const InputBox: React.FC<Props> = ({
  placeholder,
  autoCompleteType,
  value,
  autoFocus,
  setValue,
  secureTextEntry,
  isInvalid,
  xIcon
}) => {

  const boxStyle = () => {
    if (isInvalid) return styles.invalid;
    return styles.item;
  };

  const [pressed, setPressed] = useState<boolean>(false);

  const xIconPressed = () => {
    setValue('');
    setPressed(true);
  };

  return (
    <Item rounded style={boxStyle()}>
      <Input 
        placeholder={placeholder}
        autoCompleteType={autoCompleteType}
        value={value}
        autoFocus={autoFocus}
        onChangeText={(text) => setValue(text)}
        onSubmitEditing={() => setValue('')}
        placeholderTextColor='#a9a9a9'
        secureTextEntry={secureTextEntry}
        style={styles.invalid}
      />
      {isInvalid && !pressed && xIcon
      ? <Icon name='close-circle' onPress={xIconPressed}/> 
      : null}
    </Item>
  );
};


const styles = StyleSheet.create({
  item: {
    margin: '3%',
  },
  invalid: {
    borderColor: 'red',
    margin: '3%'
  }
});

export default InputBox;