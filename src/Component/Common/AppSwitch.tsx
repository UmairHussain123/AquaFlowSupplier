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
      {backgroundColor: value ? Colors.primary : Colors.chipIdle},
      value ? styles.on : styles.off,
      disabled && styles.disabled,
    ]}>
    <View style={styles.knob} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  track: {
    width: 48,
    height: 28,
    borderRadius: 999,
    padding: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  on: {justifyContent: 'flex-end'},
  off: {justifyContent: 'flex-start'},
  knob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.white,
    shadowColor: 'rgba(11,27,43,1)',
    shadowOpacity: 0.22,
    shadowRadius: 5,
    shadowOffset: {width: 0, height: 2},
    elevation: 2,
  },
  disabled: {opacity: 0.5},
});

export default AppSwitch;
