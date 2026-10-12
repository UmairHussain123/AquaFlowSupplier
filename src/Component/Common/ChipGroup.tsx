import React from 'react';
import {ScrollView, StyleSheet, TouchableOpacity} from 'react-native';
import Pill, {type PillTone} from './Pill';

export type ChipOption<T extends string | number> = {value: T; label: string};

/**
 * A horizontal row of filter chips — the catalog's "Low stock · Jars · Brand"
 * pattern, reusable. Tapping the selected chip again clears it unless
 * `required` is set, so a single row can carry an implicit "All".
 */
function ChipGroup<T extends string | number>({
  options,
  value,
  onChange,
  required = false,
  activeTone = 'primary',
}: {
  options: ChipOption<T>[];
  value: T | null;
  onChange: (next: T | null) => void;
  required?: boolean;
  activeTone?: PillTone;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.row}>
      {options.map(option => {
        const active = option.value === value;
        return (
          <TouchableOpacity
            key={String(option.value)}
            accessibilityRole="button"
            accessibilityState={{selected: active}}
            onPress={() => onChange(active && !required ? null : option.value)}>
            <Pill label={option.label} tone={active ? activeTone : 'neutral'} />
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {gap: 7, paddingRight: 20},
});

export default ChipGroup;
