import React from 'react';
import {StyleSheet, View, type StyleProp, type ViewStyle} from 'react-native';
import {Colors} from '../../Constant/Colors';

type Props = {
  children: React.ReactNode;
  /** The blue 1.5px outline the design uses for the item needing attention. */
  highlighted?: boolean;
  /** No padding — for cards whose children are full-bleed rows. */
  flush?: boolean;
  style?: StyleProp<ViewStyle>;
};

const Card: React.FC<Props> = ({children, highlighted, flush, style}) => (
  <View
    style={[
      styles.card,
      flush ? styles.flush : styles.padded,
      highlighted && styles.highlighted,
      style,
    ]}>
    {children}
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    shadowColor: 'rgba(11,27,43,1)',
    shadowOpacity: 0.06,
    shadowRadius: 24,
    shadowOffset: {width: 0, height: 8},
    elevation: 2,
  },
  padded: {padding: 15},
  flush: {overflow: 'hidden'},
  highlighted: {borderWidth: 1.5, borderColor: Colors.primary},
});

export default Card;
