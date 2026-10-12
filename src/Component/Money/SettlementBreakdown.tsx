import React from 'react';
import {StyleSheet, View} from 'react-native';
import {Colors} from '../../Constant/Colors';
import {formatMoney} from '../../helper/helperFunction';
import type {Settlement} from '../../Server/Settlements/SettlementsApi';
import Card from '../Common/Card';
import KeyValueRow from '../Common/KeyValueRow';

/**
 * Gross → commission → net, exactly as the API worked them out. The
 * commission is whatever the settlement carries — there is no fixed rate to
 * assume on the app side.
 */
const SettlementBreakdown: React.FC<{settlement: Settlement}> = ({
  settlement,
}) => (
  <Card>
    <View style={styles.lines}>
      <KeyValueRow
        label="Order value in this cycle"
        value={formatMoney(settlement.gross_amount)}
      />
      <KeyValueRow
        label="Aqua Flow commission"
        value={`− ${formatMoney(settlement.commission_amount)}`}
        tone="debit"
      />

      <View style={styles.rule} />

      <KeyValueRow
        label="Net payable"
        value={formatMoney(settlement.net_payable)}
        strong
      />
    </View>
  </Card>
);

const styles = StyleSheet.create({
  lines: {gap: 10},
  rule: {height: 1, backgroundColor: Colors.borderSoft, marginVertical: 2},
});

export default SettlementBreakdown;
