import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {Colors} from '../../Constant/Colors';

/** The radio card from SA2 — a big tappable choice with a title and hint. */
const OptionCard: React.FC<{
  title: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
}> = ({title, description, selected, onPress}) => (
  <TouchableOpacity
    activeOpacity={0.85}
    onPress={onPress}
    style={[styles.card, selected && styles.cardSelected]}>
    <View style={[styles.radio, selected && styles.radioSelected]} />
    <View style={styles.text}>
      <Text style={styles.title}>{title}</Text>
      {!!description && <Text style={styles.description}>{description}</Text>}
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: '#E7EDF4',
    borderRadius: 16,
    padding: 15,
    flexDirection: 'row',
    gap: 12,
  },
  cardSelected: {borderWidth: 1.5, borderColor: Colors.primary},
  radio: {
    width: 19,
    height: 19,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.borderCircle,
    marginTop: 2,
  },
  radioSelected: {borderWidth: 5.5, borderColor: Colors.primary},
  text: {flex: 1},
  title: {fontSize: 15.5, fontWeight: '800', color: Colors.text},
  description: {
    fontSize: 12.5,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginTop: 3,
  },
});

export default OptionCard;
