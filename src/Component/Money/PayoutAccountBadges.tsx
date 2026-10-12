import React from 'react';
import {StyleSheet, View} from 'react-native';
import Pill from '../Common/Pill';

/** "VERIFIED" / "PENDING VERIFICATION", plus "LOCKED" while ops review it. */
const PayoutAccountBadges: React.FC<{verified: boolean; locked?: boolean}> = ({
  verified,
  locked = false,
}) => (
  <View style={styles.row}>
    <Pill
      label={verified ? 'Verified' : 'Pending verification'}
      tone={verified ? 'success' : 'warning'}
      uppercase
    />
    {locked && <Pill label="Locked" tone="danger" uppercase />}
  </View>
);

const styles = StyleSheet.create({
  row: {flexDirection: 'row', flexWrap: 'wrap', gap: 6},
});

export default PayoutAccountBadges;
