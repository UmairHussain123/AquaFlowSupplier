import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Colors} from '../../Constant/Colors';
import {Fonts} from '../../Constant/Fonts';

/** "Delivery fee ............ Rs 40" — the totals lines. */
const KeyValueRow: React.FC<{
  label: string;
  value: string;
  tone?: 'neutral' | 'credit' | 'debit' | 'warn';
  strong?: boolean;
}> = ({label, value, tone = 'neutral', strong = false}) => {
  const color =
    tone === 'credit'
      ? Colors.success
      : tone === 'debit'
      ? Colors.danger
      : tone === 'warn'
      ? Colors.warningText
      : Colors.text;

  return (
    <View style={styles.row}>
      <Text style={[styles.label, strong && styles.labelStrong]}>{label}</Text>
      <Text style={[styles.value, {color}, strong && styles.valueStrong]}>
        {value}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  label: {flex: 1, fontSize: 13, color: Colors.textSecondary},
  labelStrong: {fontSize: 15, fontWeight: '800', color: Colors.text},
  value: {fontFamily: Fonts.mono, fontSize: 13},
  valueStrong: {fontSize: 20, fontWeight: '800'},
});

export default KeyValueRow;
