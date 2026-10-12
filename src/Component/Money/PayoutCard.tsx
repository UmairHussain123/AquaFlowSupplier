import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Colors} from '../../Constant/Colors';
import {Fonts} from '../../Constant/Fonts';
import {formatMoney} from '../../helper/helperFunction';
import {
  describeAccount,
  formatDay,
  type Payout,
} from '../../Server/Settlements/SettlementsApi';
import Card from '../Common/Card';
import InfoNote from '../Common/InfoNote';
import StatusBadge from '../Common/StatusBadge';

/**
 * One payout against a settlement: amount, status, when it was paid, the bank
 * reference and the account it went to — with the hold warning when that
 * account isn't verified yet.
 */
const PayoutCard: React.FC<{payout: Payout}> = ({payout}) => {
  const account = payout.payout_account ?? null;
  const paid = payout.status === 'paid';

  const when = payout.paid_at
    ? `Paid ${formatDay(payout.paid_at)}`
    : `Raised ${formatDay(payout.created_at)}`;

  const accountLine = account
    ? [account.account_title, describeAccount(account)]
        .filter(Boolean)
        .join(' · ') || 'Account details not on record'
    : 'No payout account on record';

  return (
    <Card>
      <View style={styles.head}>
        <View style={styles.flex}>
          <Text style={styles.label}>{paid ? 'Paid out' : 'Payout'}</Text>
          <Text style={styles.amount}>{formatMoney(payout.amount)}</Text>
        </View>
        <StatusBadge status={payout.status} />
      </View>

      <View style={styles.details}>
        <Text style={styles.meta}>
          {when}
          {payout.reference ? ' · Ref ' : ''}
          {!!payout.reference && (
            <Text style={styles.reference}>{payout.reference}</Text>
          )}
        </Text>
        <Text style={styles.account} numberOfLines={2}>
          {accountLine}
        </Text>
      </View>

      {!!account && !account.is_verified && (
        <View style={styles.note}>
          <InfoNote tone="warning">
            Not verified yet — payouts stay on hold until Aqua Flow verifies
            this account.
          </InfoNote>
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  flex: {flex: 1},
  head: {flexDirection: 'row', alignItems: 'flex-start', gap: 12},
  label: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: Colors.textMuted,
  },
  amount: {
    fontFamily: Fonts.mono,
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
    marginTop: 3,
  },
  details: {gap: 4, marginTop: 10},
  meta: {fontSize: 12.5, color: Colors.textSecondary},
  reference: {fontFamily: Fonts.mono, color: Colors.text},
  account: {fontSize: 12.5, fontWeight: '700', color: Colors.slate},
  note: {marginTop: 11},
});

export default PayoutCard;
