import React, {useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Colors} from '../../Constant/Colors';
import {
  apiErrorMessage,
  formatMoney,
  pluralize,
} from '../../helper/helperFunction';
import {
  containerTypeLabel,
  estimateRefund,
  reconcileContainerTransaction,
  type ContainerTransaction,
} from '../../Server/Container/ContainerTransactionsApi';
import AppButton from '../Common/AppButton';
import AppInput from '../Common/AppInput';
import AppModal from '../Common/AppModal';
import InfoNote from '../Common/InfoNote';
import QuantityStepper from '../Common/QuantityStepper';

/**
 * Record what actually came back for a pending jar-deposit record. Same rules
 * as the portal: whole counts, and returned + damaged can't exceed what was
 * expected back. The refund line uses the API's own formula.
 */
const ReconcileSheet: React.FC<{
  shopId: number;
  transaction: ContainerTransaction;
  onClose: () => void;
  onSaved: (transaction: ContainerTransaction) => void;
}> = ({shopId, transaction: tx, onClose, onSaved}) => {
  const expected = Math.max(0, tx.expected_quantity ?? 0);

  const [returned, setReturned] = useState(expected);
  const [damaged, setDamaged] = useState(0);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const over = returned + damaged > expected;
  const missing = expected - returned - damaged;

  const close = () => {
    if (!submitting) onClose();
  };

  const submit = async () => {
    if (
      !Number.isInteger(returned) ||
      !Number.isInteger(damaged) ||
      returned < 0 ||
      damaged < 0
    ) {
      setError('Counts must be whole numbers, 0 or higher.');
      return;
    }
    if (over) {
      setError(
        `Returned plus damaged can't exceed the ${pluralize(
          expected,
          'jar',
        )} expected back.`,
      );
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const saved = await reconcileContainerTransaction(shopId, tx.id, {
        returned_quantity: returned,
        damaged_quantity: damaged,
        ...(notes.trim() ? {notes: notes.trim()} : {}),
      });
      onSaved(saved);
    } catch (err) {
      setError(
        apiErrorMessage(
          err,
          "Couldn't save this reconciliation. Please try again.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppModal
      visible
      title={`Reconcile ${tx.order_number ?? `order #${tx.order_id}`}`}
      subtitle="Count what the rider brought back."
      onClose={close}
      footer={
        <>
          <AppButton title="Cancel" variant="secondary" onPress={close} />
          <AppButton
            title="Confirm return"
            onPress={submit}
            loading={submitting}
            disabled={over}
          />
        </>
      }>
      <View style={styles.summary}>
        <Text style={styles.summaryTitle}>
          {containerTypeLabel(tx)} · {expected} expected back
        </Text>
        <Text style={styles.summaryMeta}>
          {tx.customer?.name ?? 'Customer'} · deposit charged{' '}
          {formatMoney(tx.deposit_charged)}
        </Text>
      </View>

      <QuantityStepper
        label="Returned"
        value={returned}
        onChange={next => {
          setReturned(next);
          setError(null);
        }}
        max={expected}
        disabled={submitting}
      />
      <QuantityStepper
        label="Damaged"
        value={damaged}
        onChange={next => {
          setDamaged(next);
          setError(null);
        }}
        max={expected}
        tone={damaged > 0 ? 'warning' : 'neutral'}
        disabled={submitting}
      />

      {over ? (
        <Text style={styles.error}>
          Returned plus damaged can't exceed the {pluralize(expected, 'jar')}{' '}
          expected back.
        </Text>
      ) : (
        <Text style={styles.refund}>
          Deposit refunded to the customer:{' '}
          <Text style={styles.refundValue}>
            {formatMoney(estimateRefund(tx, returned))}
          </Text>
        </Text>
      )}

      {!over && missing > 0 && (
        <InfoNote tone="warning">
          {pluralize(missing, 'jar')} still not accounted for — the customer
          keeps owing {missing === 1 ? 'it' : 'them'} and the deposit stays
          held.
        </InfoNote>
      )}

      <AppInput
        label="Notes (optional)"
        value={notes}
        onChangeText={setNotes}
        placeholder="e.g. Two caps missing, customer will return the rest on Friday."
        multiline
        maxLength={1000}
      />

      <Text style={styles.hint}>
        Returned jars earn their deposit back; damaged jars forfeit it. Once
        saved, only Aqua Flow can change this record.
      </Text>

      {!!error && !over && <Text style={styles.error}>{error}</Text>}
    </AppModal>
  );
};

const styles = StyleSheet.create({
  summary: {
    backgroundColor: Colors.surface3,
    borderRadius: 15,
    padding: 14,
  },
  summaryTitle: {fontSize: 14, fontWeight: '800', color: Colors.text},
  summaryMeta: {fontSize: 12, color: Colors.textSecondary, marginTop: 3},
  refund: {fontSize: 12.5, color: Colors.textSecondary},
  refundValue: {fontWeight: '800', color: Colors.text},
  hint: {fontSize: 12, color: Colors.textMuted, lineHeight: 18},
  error: {fontSize: 13, color: Colors.danger, fontWeight: '600'},
});

export default ReconcileSheet;
