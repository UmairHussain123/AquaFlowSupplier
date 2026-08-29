import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {Colors} from '../../Constant/Colors';
import {Fonts} from '../../Constant/Fonts';
import {MinusIcon, PlusIcon} from '../Icons/TabIcons';

/** The "−  2  +" control used for empties, damages and stock. */
const QuantityStepper: React.FC<{
  label: string;
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  tone?: 'neutral' | 'warning';
  disabled?: boolean;
}> = ({label, value, onChange, min = 0, max = 999, tone = 'neutral', disabled}) => {
  const warn = tone === 'warning';

  return (
    <View
      style={[
        styles.row,
        {backgroundColor: warn ? Colors.warningBg : Colors.surface},
      ]}>
      <Text
        style={[styles.label, warn && {color: Colors.warningText, fontWeight: '800'}]}>
        {label}
      </Text>

      <View style={styles.controls}>
        <TouchableOpacity
          disabled={disabled || value <= min}
          onPress={() => onChange(Math.max(min, value - 1))}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
          style={value <= min && styles.dim}>
          <MinusIcon color={Colors.primary} size={20} />
        </TouchableOpacity>

        <Text style={styles.value}>{value}</Text>

        <TouchableOpacity
          disabled={disabled || value >= max}
          onPress={() => onChange(Math.min(max, value + 1))}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
          style={value >= max && styles.dim}>
          <PlusIcon color={Colors.primary} size={20} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {flex: 1, fontSize: 13, color: Colors.textSecondary},
  controls: {flexDirection: 'row', alignItems: 'center', gap: 15},
  value: {
    fontFamily: Fonts.mono,
    fontSize: 17,
    fontWeight: '800',
    color: Colors.text,
    minWidth: 26,
    textAlign: 'center',
  },
  dim: {opacity: 0.35},
});

export default QuantityStepper;
