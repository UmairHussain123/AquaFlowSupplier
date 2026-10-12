import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {Colors} from '../../Constant/Colors';
import {Fonts} from '../../Constant/Fonts';
import {formatShortDateTime} from '../../helper/dateHelper';
import {formatMoney, toNumber} from '../../helper/helperFunction';
import {
  containerTypeLabel,
  type ContainerTransaction,
} from '../../Server/Container/ContainerTransactionsApi';
import AppButton from '../Common/AppButton';
import Card from '../Common/Card';
import StatusBadge from '../Common/StatusBadge';

/** One small "label over number" cell in the jar counts strip. */
const Stat: React.FC<{label: string; value: string; warn?: boolean}> = ({
  label,
  value,
  warn = false,
}) => (
  <View style={styles.stat}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={[styles.statValue, warn && styles.statWarn]}>{value}</Text>
  </View>
);

/**
 * One jar-deposit record: the order it came from, the customer, how many jars
 * came back against how many were expected, and the deposit still held. A
 * pending record carries the Reconcile action.
 */
const ContainerTransactionCard: React.FC<{
  transaction: ContainerTransaction;
  onOpenOrder: () => void;
  onReconcile?: () => void;
}> = ({transaction: tx, onOpenOrder, onReconcile}) => {
  const refunded = toNumber(tx.deposit_refunded);

  return (
    <Card>
      <View style={styles.head}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onOpenOrder}
          style={styles.flex}>
          <Text style={styles.order} numberOfLines={1}>
            {tx.order_number ?? `Order #${tx.order_id}`}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {formatShortDateTime(tx.created_at)} ·{' '}
            {tx.customer?.name ?? 'Customer'}
          </Text>
        </TouchableOpacity>
        <StatusBadge status={tx.status} />
      </View>

      <Text style={styles.type} numberOfLines={1}>
        {containerTypeLabel(tx)}
      </Text>

      <View style={styles.stats}>
        <Stat
          label="Returned"
          value={`${tx.returned_quantity ?? 0}/${tx.expected_quantity ?? 0}`}
        />
        <Stat
          label="Damaged"
          value={String(tx.damaged_quantity ?? 0)}
          warn={toNumber(tx.damaged_quantity) > 0}
        />
        <Stat
          label="Outstanding"
          value={String(tx.outstanding_quantity ?? 0)}
          warn={toNumber(tx.outstanding_quantity) > 0}
        />
      </View>

      <View style={styles.deposit}>
        <Text style={styles.depositLabel}>Deposit held</Text>
        <Text style={styles.depositValue}>{formatMoney(tx.deposit_held)}</Text>
        <Text style={styles.depositOf}>
          of {formatMoney(tx.deposit_charged)}
          {refunded > 0 ? ` · refunded ${formatMoney(refunded)}` : ''}
        </Text>
      </View>

      {!!tx.notes && (
        <Text style={styles.notes} numberOfLines={2}>
          {tx.notes}
        </Text>
      )}

      {tx.status === 'pending' && !!onReconcile && (
        <AppButton
          title="Reconcile"
          small
          onPress={onReconcile}
          style={styles.action}
        />
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  flex: {flex: 1},
  head: {flexDirection: 'row', alignItems: 'flex-start', gap: 12},
  order: {
    fontFamily: Fonts.mono,
    fontSize: 14,
    fontWeight: '800',
    color: Colors.primary,
  },
  meta: {fontSize: 12, color: Colors.textSecondary, marginTop: 3},
  type: {fontSize: 13.5, fontWeight: '800', color: Colors.text, marginTop: 10},

  stats: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  stat: {
    flex: 1,
    backgroundColor: Colors.surface3,
    borderRadius: 13,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  statLabel: {fontSize: 11, fontWeight: '700', color: Colors.textMuted},
  statValue: {
    fontFamily: Fonts.mono,
    fontSize: 15,
    fontWeight: '800',
    color: Colors.text,
    marginTop: 2,
  },
  statWarn: {color: Colors.warningText},

  deposit: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 11,
  },
  depositLabel: {fontSize: 12.5, color: Colors.textSecondary},
  depositValue: {
    fontFamily: Fonts.mono,
    fontSize: 14,
    fontWeight: '800',
    color: Colors.text,
  },
  depositOf: {fontSize: 12, color: Colors.textMuted},
  notes: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 8,
  },
  action: {marginTop: 12},
});

export default ContainerTransactionCard;
