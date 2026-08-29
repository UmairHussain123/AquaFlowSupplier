import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {Colors} from '../../Constant/Colors';
import {Fonts} from '../../Constant/Fonts';
import {formatMoney} from '../../helper/helperFunction';
import type {Dispute} from '../../Server/Disputes/DisputesApi';
import Card from '../Common/Card';
import Pill from '../Common/Pill';
import StatusBadge from '../Common/StatusBadge';

/** One jar dispute. Investigating and deciding is admin-side — the supplier
 *  raises the claim and watches for the ops decision. */
const DisputeCard: React.FC<{dispute: Dispute; onPress: () => void}> = ({
  dispute,
  onPress,
}) => {
  const adjustment = dispute.financial_adjustment_amount;

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
      <Card>
        <View style={styles.head}>
          <Text style={styles.reference}>{dispute.reference}</Text>
          <StatusBadge status={dispute.status} />
        </View>

        {!!dispute.order_number && (
          <Text style={styles.order}>Order {dispute.order_number}</Text>
        )}

        <Text style={styles.claim} numberOfLines={3}>
          {dispute.claim}
        </Text>

        <View style={styles.chips}>
          {!!dispute.deposit && (
            <Pill label={`Deposit ${formatMoney(dispute.deposit)}`} tone="warning" />
          )}
          {!!adjustment && (
            <Pill
              label={`Adjustment ${formatMoney(adjustment)}`}
              tone={Number(adjustment) < 0 ? 'danger' : 'success'}
            />
          )}
        </View>

        <Text style={styles.age}>raised {dispute.age} ago</Text>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  head: {flexDirection: 'row', alignItems: 'center', gap: 9, flexWrap: 'wrap'},
  reference: {
    fontFamily: Fonts.mono,
    fontSize: 12.5,
    fontWeight: '600',
    color: Colors.text,
  },
  order: {
    fontSize: 14.5,
    fontWeight: '800',
    color: Colors.text,
    marginTop: 9,
  },
  claim: {
    fontSize: 12.5,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginTop: 5,
  },
  chips: {flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 9},
  age: {
    fontSize: 11.5,
    color: Colors.textMuted,
    fontFamily: Fonts.mono,
    marginTop: 8,
  },
});

export default DisputeCard;
