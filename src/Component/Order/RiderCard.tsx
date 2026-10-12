import React, {useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Colors} from '../../Constant/Colors';
import {formatDateTime} from '../../helper/dateHelper';
import type {DashboardRider} from '../../Server/Dashboard/SupplierDashboardApi';
import type {OrderDelivery} from '../../Server/Order/OrderType';
import AppButton from '../Common/AppButton';
import Card from '../Common/Card';
import SelectField from '../Common/SelectField';

/**
 * "Delivery rider" on order detail: who has the order and since when, plus —
 * for owners and managers while the order is still at the shop — a picker to
 * assign or hand it to someone else.
 */
const RiderCard: React.FC<{
  delivery: OrderDelivery | null | undefined;
  canAssign: boolean;
  riders: DashboardRider[];
  ridersLoading?: boolean;
  ridersError?: string | null;
  busy?: boolean;
  /** Resolves true when the assignment went through, so the picker resets. */
  onAssign: (riderId: number) => Promise<boolean>;
}> = ({
  delivery,
  canAssign,
  riders,
  ridersLoading = false,
  ridersError = null,
  busy = false,
  onAssign,
}) => {
  const [choice, setChoice] = useState<number | null>(null);
  const currentId = delivery?.rider_id ?? delivery?.rider?.id ?? null;

  const assign = async () => {
    if (choice === null) return;
    if (await onAssign(choice)) setChoice(null);
  };

  return (
    <Card>
      <Text style={styles.label}>Delivery rider</Text>
      <Text style={styles.name}>{delivery?.rider?.name ?? 'Not assigned yet'}</Text>
      {!!delivery?.assigned_at && (
        <Text style={styles.meta}>
          Assigned {formatDateTime(delivery.assigned_at)}
        </Text>
      )}

      {canAssign && (
        <View style={styles.picker}>
          {ridersLoading ? (
            <Text style={styles.meta}>Loading riders…</Text>
          ) : ridersError ? (
            <Text style={styles.error}>{ridersError}</Text>
          ) : riders.length === 0 ? (
            <Text style={styles.meta}>
              No active riders yet — the owner can add one under Staff.
            </Text>
          ) : (
            <>
              <SelectField
                placeholder="Choose a rider…"
                value={choice}
                options={riders.map(rider => ({
                  value: rider.id,
                  label: rider.id === currentId ? `${rider.name} (current)` : rider.name,
                }))}
                onChange={value => setChoice(Number(value))}
                disabled={busy}
              />
              <AppButton
                title={delivery?.rider ? 'Reassign rider' : 'Assign rider'}
                onPress={assign}
                loading={busy}
                disabled={choice === null || choice === currentId}
                small
              />
            </>
          )}
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  label: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: Colors.textMuted,
  },
  name: {fontSize: 15, fontWeight: '800', color: Colors.text, marginTop: 10},
  meta: {fontSize: 12, color: Colors.textSecondary, marginTop: 4, lineHeight: 18},
  error: {fontSize: 12, color: Colors.danger, fontWeight: '600', marginTop: 4},
  picker: {gap: 10, marginTop: 12},
});

export default RiderCard;
