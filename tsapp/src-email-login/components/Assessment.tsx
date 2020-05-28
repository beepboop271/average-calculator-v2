import React, {useState, useRef, useContext} from 'react';
import {Text} from 'native-base';
import { StyleSheet, View, TouchableOpacity, Animated} from 'react-native';


import StrandComponent from './StrandComponent';
import {Marks, Strand} from '../utils/functions';
import {UserContext, ThemeContext, ThemeColour} from '../utils/contexts';

interface Props {
  name: string;
  marks: Marks;
  average: string|null;
  feedback: string;
};


const Assessment: React.FC<Props> = ({
  name,
  marks,
  average,
  feedback
}) => {
  const {animationEnabled} = useContext(UserContext);
  const {colour} = useContext(ThemeContext);
  const {styles, flippedStyles} = getStyles(colour);

  const [flipped, setFlipped] = useState<boolean>(false);
  const [displayFeedback, setDisplayFeedback] = useState<boolean>(false);
  const flipAnim = useRef(new Animated.Value(0)).current;

  const flipCard = () => {
    setDisplayFeedback(false);
    if (!animationEnabled) {
      setFlipped(!flipped);
      return;
    }

    Animated.timing(flipAnim, {
      toValue: flipped ? 0 : 1,
      duration: 400,
      useNativeDriver: true
    }).start();
    setTimeout(() => setFlipped(!flipped), 100);
  };

  const flip = StyleSheet.create({
    front: {
      transform: [
        {rotateX: flipAnim.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '180deg']
        }) as unknown as string},
      ],
    },
    back: {
      transform: [
        {rotateX: flipAnim.interpolate({
          inputRange: [0, 1],
          outputRange: ['180deg', '360deg']
        }) as unknown as string},
      ],
    }
  });

  const opacity = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0, 1]
  });

  const getStrands = () => {
    return Object.keys(marks).map((strand: string) => {
      const typedStrand = strand as Strand;
      return (
        <StrandComponent 
          mark={marks[typedStrand]}
          strand={typedStrand}/>
      );
    });
  };

  const getAvgDisplay = () => {
    if (average === 'NaN') return 'Unweighted';
    else if (!average) return 'N/A';
    return `${average}%`;
  }; 

  const getTextAttributes = () => {
    if (!average || average === 'NaN') {
      return {
        opacity: 0.3,
        fontSize: 15
      }
    };
    return {opacity: 1};
  };

  return (
      <Animated.View style={{opacity: opacity, marginTop: 5}}>
        {!flipped ?
        <TouchableOpacity 
          activeOpacity={0.5}
          style={[styles.wrapper, animationEnabled ? flip.front : undefined]}
          onPress={flipCard}
        >
          <View style={styles.nameWrapper}>
            <Text style={[styles.name, getTextAttributes()]}>{name}</Text>
          </View>
          <View style={styles.avgWrapper}>
            <Text style={[styles.avg, getTextAttributes()]}>
              {getAvgDisplay()}
            </Text>
          </View>
        </TouchableOpacity>
        :
        <TouchableOpacity
          activeOpacity={0.5}
          style={[flippedStyles.wrapper, animationEnabled ? flip.back : undefined]}
          onPress={flipCard}
        >
          <View style={flippedStyles.nameWrapper}>
            <Text style={flippedStyles.name}>{name}</Text>
            {
            feedback && feedback !== ""
            ? <TouchableOpacity
                style={flippedStyles.feedbackButton}
                onPress={() => setDisplayFeedback(!displayFeedback)}  
              ><Text style={[flippedStyles.feedback, {fontSize: 10}]}>Feedback</Text></TouchableOpacity>  
            : null
            }
          </View>
          <View style={flippedStyles.strands}>
            {displayFeedback ?
              <Text style={flippedStyles.feedback}>{feedback}</Text>
            : getStrands()
            }
          </View>
        </TouchableOpacity>
        }
      </Animated.View>
    
    
  );
};

const getStyles = (colour: ThemeColour) => {
  const styles = StyleSheet.create({
    wrapper: {
      height: 120,
      borderRadius: 10,
      flexDirection: 'row',
      borderColor: colour.assessmentCard.border,
      borderWidth: 1,
      alignContent: 'center',
      justifyContent: 'center',
      padding: 20,
      backgroundColor: colour.assessmentCard.background
    },
    nameWrapper: {
      flex: 1.3,
      alignSelf: 'center'
    },
    name: {
      fontFamily: 'sans-serif',
      fontSize: 15,
      color: colour.assessmentCard.text
    },
    avgWrapper: {
      flex: 1,
      marginLeft: 'auto',
      alignSelf: 'center'
    },
    avg: {
      marginLeft: 'auto',
      marginRight: 'auto',
      fontFamily: 'sans-serif',
      fontSize: 20,
      fontWeight: 'bold',
      color: colour.assessmentCard.text
    }
  });
  
  const flippedStyles = StyleSheet.create({
    wrapper: {
      height: 320,
      borderRadius: 10,
      flexDirection: 'column',
      borderColor: colour.assessmentCard.border,
      borderWidth: 1,
      alignContent: 'center',
      justifyContent: 'center',
      padding: 20,
      backgroundColor: colour.assessmentCard.background
    },
    nameWrapper: {
      flex: 0.4,
      flexDirection: 'row',
    },
    name: {
      fontFamily: 'sans-serif',
      fontSize: 18,
      color: colour.assessmentCard.text,
      alignSelf: 'center',
      textAlign: 'center',
      flex: 5,
      margin: 10
    },
    feedbackButton: {
      borderColor: colour.assessmentCard.text,
      borderWidth: 0.5,
      flex: 1,
      alignSelf: 'center',
      height: 30,
      justifyContent: 'center'
    },
    feedback: {
      fontFamily: 'sans-serif',
      fontSize: 13,
      color: colour.assessmentCard.text,
      alignSelf: 'center',
      textAlign: 'center',
      marginLeft: 0
    },
    strands: {
      flex: 2,
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignSelf: 'center',
    }
  });

  return {
    styles: styles, 
    flippedStyles: flippedStyles
  };
};


export default Assessment;