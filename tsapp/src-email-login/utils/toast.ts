import {Toast} from 'native-base';
import { StyleSheet } from 'react-native';


export interface Props {
  type: "danger" | "success" | "warning" | undefined;
  text: string;
};

export const createToast = (props: Props) => {
  Toast.show({
    ...props,
    duration: 1000,
    style: styles.toastView,
    textStyle: styles.toastText,
    position: 'top'
  });
};

const styles = StyleSheet.create({
  toastView: {
    flexDirection: 'row',
    marginLeft: '10%',
    marginRight: '10%',
    borderRadius: 10,
    marginBottom: '3%'
  },
  toastText: {
    textAlign: 'center',
    alignSelf: 'center',
    flex: 1
  }
});

export default createToast;
