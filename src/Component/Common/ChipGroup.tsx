import React from 'react';
import {ScrollView, StyleSheet, TouchableOpacity, View} from 'react-native';
import Pill, {type PillTone} from './Pill';

export type ChipOption<T extends string | number> = {value: T; label: string};

/**
 * A row of filter chips — the catalog's "Low stock · Jars · Brand" pattern,
 * reusable. Tapping the selected chip again clears it unless `required` is
 * set, so a single row can carry an implicit "All". `wrap` flows chips onto
 * further lines instead of scrolling sideways — for a list the user should
 * see all of at a glance, like the shop switcher.
 */
function ChipGroup<T extends string | number>({
  options,
  value,
  onChange,
  required = false,
  activeTone = 'primary',
  wrap = false,
}: {
  options: ChipOption<T>[];
  value: T | null;
  onChange: (next: T | null) => void;
  required?: boolean;
  activeTone?: PillTone;
  wrap?: boolean;
}) {
  const chips = options.map(option => {
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
  });

  if (wrap) {
    return <View style={styles.wrapRow}>{chips}</View>;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.row}>
      {chips}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {gap: 7, paddingRight: 20},
  wrapRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 7},
});

export default ChipGroup;
