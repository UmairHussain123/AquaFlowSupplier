import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Colors} from '../../Constant/Colors';
import {PASSWORD_RULES} from '../../Formik/PasswordRules';
import {CheckIcon} from '../Icons/TabIcons';

/** Renders the password policy live as the supplier types. */
const PasswordChecklist: React.FC<{value: string}> = ({value}) => (
  <View style={styles.wrap}>
    {PASSWORD_RULES.map(rule => {
      const met = rule.test(value ?? '');
      return (
        <View key={rule.label} style={styles.row}>
          <View style={[styles.dot, met && styles.dotMet]}>
            {met && <CheckIcon color={Colors.white} size={10} />}
          </View>
          <Text style={[styles.label, met && styles.labelMet]}>{rule.label}</Text>
        </View>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.noteSoft,
    borderRadius: 16,
    padding: 13,
    gap: 8,
  },
  row: {flexDirection: 'row', alignItems: 'center', gap: 9},
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Colors.borderCircle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotMet: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  label: {fontSize: 12.5, color: Colors.textSecondary},
  labelMet: {color: Colors.successText, fontWeight: '700'},
});

export default PasswordChecklist;
