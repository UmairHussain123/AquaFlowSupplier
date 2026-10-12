import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Colors} from '../../Constant/Colors';
import {PASSWORD_RULES} from '../../Formik/PasswordRules';

/** What to ask for next, in rule order. */
const NEXT_HINT: Record<string, string> = {
  'At least 8 characters': 'Use at least 8 characters',
  'A letter': 'Add a letter',
  'A number': 'Add a number',
  'A special character': 'Add a special character, like @ or #',
};

/**
 * The one-line take on PasswordChecklist: a segment per rule met, plus the
 * next rule still missing. Same policy, a fraction of the height.
 */
const PasswordStrength: React.FC<{value: string}> = ({value}) => {
  const results = PASSWORD_RULES.map(rule => rule.test(value ?? ''));
  const met = results.filter(Boolean).length;
  const missing = PASSWORD_RULES.find((_, index) => !results[index]);
  const strong = !missing;

  return (
    <View style={styles.wrap}>
      <View style={styles.bars}>
        {results.map((_, index) => (
          <View
            key={index}
            style={[
              styles.bar,
              index < met && (strong ? styles.barStrong : styles.barPartial),
            ]}
          />
        ))}
      </View>
      <Text style={[styles.hint, strong && styles.hintStrong]}>
        {strong
          ? 'Strong password'
          : value
          ? NEXT_HINT[missing!.label] ?? missing!.label
          : '8+ characters with a letter, a number and a symbol'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {gap: 6},
  bars: {flexDirection: 'row', gap: 4},
  bar: {flex: 1, height: 4, borderRadius: 2, backgroundColor: Colors.borderSoft},
  barPartial: {backgroundColor: Colors.warning},
  barStrong: {backgroundColor: Colors.success},
  hint: {fontSize: 11.5, color: Colors.textMuted},
  hintStrong: {color: Colors.successText, fontWeight: '700'},
});

export default PasswordStrength;
