import React, {useContext} from 'react';
import {Text} from 'native-base';
import { StyleSheet, View, } from 'react-native';

import {Strand, Mark} from '../utils/functions';
import {ThemeContext, ThemeColour} from '../utils/contexts';

interface Props {
  mark: Mark|null;
  strand: Strand;
  courseStrand?: boolean;
};

const StrandComponent: React.FC<Props> = ({mark, strand, courseStrand = false}) => {
  //then it's probably null
  const {colour} = useContext(ThemeContext);
  const styles = getStyles(colour);


  if (!mark || mark.denominator === 0) return (
    <View style={{alignSelf: 'flex-end'}}>
      <View style={[{
        height: 10,
        borderColor: colour.assessmentCard.strand.null
      }, styles.view]}/>
      <Text style={styles.weightText}/>
      <Text style={styles.text}/>
    </View>
  );
  
  
  return (
    <View style={{alignSelf: 'flex-end'}}>
      <Text style={styles.percent}>
        {Math.round(mark.numerator/mark.denominator*1000)/10}%
      </Text>
      <View style={[{
        height: mark.numerator/mark.denominator*100*1.5+10,
        borderColor: colour.assessmentCard.strand.outline,
      }, styles.view]}>
        {!courseStrand ?
        <View>
          <Text style={styles.text}>{mark.numerator}</Text>
          <View style={styles.line}/>
          <Text style={styles.text}>{mark.denominator}</Text>
        </View>
        : null}
        <Text style={styles.strand}>{strand.toUpperCase()}</Text>
      </View>
      <Text style={styles.weightText}>weight</Text>
      <Text style={styles.text}>{mark.weight}</Text>
    </View>
    
  );
}; 

const getStyles = (colour: ThemeColour) => {
  const styles = StyleSheet.create({
    view: {
      borderWidth: 1,
      width: 50,
      alignSelf: 'flex-end',
      borderTopLeftRadius: 7,
      borderTopRightRadius: 7,
      marginLeft: 2,
      marginRight: 2
    },
    line: {
      height: 1,
      backgroundColor: colour.assessmentCard.strand.text,
      marginLeft: 5,
      marginRight: 5
    },
    text: {
      color: colour.assessmentCard.strand.text,
      fontFamily: 'sans-serif',
      fontSize: 15,
      textAlign: 'center',
    },
    weightText: {
      color: colour.assessmentCard.strand.text,
      fontFamily: 'sans-serif',
      fontSize: 10,
      textAlign: 'center',
    },
    percent: {
      color: colour.assessmentCard.strand.percent,
      fontFamily: 'sans-serif',
      fontSize: 13,
      textAlign: 'center',
      marginBottom: 2
    },
    strand: {
      color: colour.assessmentCard.strand.text,
      fontFamily: 'sans-serif',
      fontSize: 13,
      textAlign: 'center',
      marginTop: 'auto'    
    }
  });
  return styles;
};

export default StrandComponent;