import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Colors} from '../../Constant/Colors';
import ChipGroup, {type ChipOption} from '../Common/ChipGroup';

/** A small caps label over one row of filter chips — the portal's filter selects. */
function FilterRow<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: ChipOption<T>[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <ChipGroup
        options={options}
        value={value}
        required
        onChange={next => {
          if (next !== null) onChange(next);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {gap: 7},
  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: Colors.textMuted,
  },
});

export default FilterRow;
