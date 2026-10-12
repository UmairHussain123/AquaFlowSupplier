import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Colors} from '../../Constant/Colors';
import AppButton from '../Common/AppButton';

/** The red "Couldn't load … [Retry]" strip at the top of the dashboard. */
const RetryBanner: React.FC<{
  message: string;
  onRetry: () => void;
  busy?: boolean;
}> = ({message, onRetry, busy = false}) => (
  <View accessibilityRole="alert" style={styles.banner}>
    <Text style={styles.message}>{message}</Text>
    <AppButton
      title="Retry"
      variant="danger"
      small
      block={false}
      loading={busy}
      onPress={onRetry}
    />
  </View>
);

const styles = StyleSheet.create({
  banner: {
    backgroundColor: Colors.dangerBg,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  message: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '700',
    color: Colors.danger,
  },
});

export default RetryBanner;
