import React from 'react';
import {StyleSheet, View} from 'react-native';
import {Colors} from '../../Constant/Colors';

/** The 4-segment progress bar used by the application wizard and SB4. */
const ProgressSteps: React.FC<{
  total: number;
  current: number;
  /** Segments already behind `current` render green instead of blue. */
  completedTone?: 'primary' | 'success';
}> = ({total, current, completedTone = 'primary'}) => (
  <View style={styles.row}>
    {Array.from({length: total}, (_, index) => {
      const done = index < current - 1;
      const active = index === current - 1;
      const color = done
        ? completedTone === 'success'
          ? Colors.success
          : Colors.primary
        : active
        ? Colors.primary
        : Colors.borderIdle;

      return <View key={index} style={[styles.bar, {backgroundColor: color}]} />;
    })}
  </View>
);

const styles = StyleSheet.create({
  row: {flexDirection: 'row', gap: 6},
  bar: {flex: 1, height: 5, borderRadius: 3},
});

export default ProgressSteps;
