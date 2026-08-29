import React from 'react';
import {StyleSheet, Text} from 'react-native';
import {Colors} from '../../Constant/Colors';

/** The inline field error used under every input in the forms. */
const ErrorText: React.FC<{error?: string | false | null | any}> = ({error}) => {
  // Formik types a field error as string | string[] | FormikErrors — only a
  // plain string is renderable, anything else means the field is an object.
  if (!error || typeof error !== 'string') return null;
  return <Text style={styles.text}>{error}</Text>;
};

const styles = StyleSheet.create({
  text: {
    fontSize: 12,
    color: Colors.danger,
    fontWeight: '600',
    marginTop: 4,
  },
});

export default ErrorText;
