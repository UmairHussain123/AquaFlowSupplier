import React from 'react';
import {StyleSheet, TouchableOpacity, View} from 'react-native';
import {Colors} from '../../Constant/Colors';

/** The green pill toggle from the catalog rows (SB5). */
const AppSwitch: React.FC<{
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
}> = ({value, onValueChange, disabled = false}) => (
  <TouchableOpacity
    accessibilityRole="switch"
    accessibilityState={{checked: value, disabled}}
    activeOpacity={0.8}
    disabled={disabled}
    onPress={() => onValueChange(!value)}
    style={[
      styles.track,
      {backgroundColor: value ? Colors.success : Colors.borderIdle},
      value ? styles.on : styles.off,
      disabled && styles.disabled,
    ]}>
    <View style={styles.knob} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  track: {
    width: 44,
    height: 26,
    borderRadius: 999,
    padding: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  on: {justifyContent: 'flex-end'},
  off: {justifyContent: 'flex-start'},
  knob: {width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.white},
  disabled: {opacity: 0.5},
});

export default AppSwitch;
