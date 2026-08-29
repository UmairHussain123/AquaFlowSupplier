import React from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import {Colors} from '../../Constant/Colors';

const ScreenLoader: React.FC<{message?: string}> = ({message}) => (
  <View style={styles.wrap}>
    <ActivityIndicator color={Colors.primary} size="large" />
    {!!message && <Text style={styles.text}>{message}</Text>}
  </View>
);

const styles = StyleSheet.create({
  wrap: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10},
  text: {fontSize: 13, color: Colors.textSecondary},
});

export default ScreenLoader;
