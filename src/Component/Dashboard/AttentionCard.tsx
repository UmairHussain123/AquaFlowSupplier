import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Colors} from '../../Constant/Colors';
import {statusLabel, toNumber} from '../../helper/helperFunction';
import type {SupplierDashboard} from '../../Server/Dashboard/SupplierDashboardApi';
import Card from '../Common/Card';
import KeyValueRow from '../Common/KeyValueRow';

/**
 * "Waiting on you" — the live backlog from GET /supplier/dashboard — and how
 * each of the shop's riders is doing today. Owner and manager only.
 */
const AttentionCard: React.FC<{summary: SupplierDashboard}> = ({summary}) => {
  const awaitingAcceptance = toNumber(summary.attention?.awaiting_acceptance);
  const awaitingRider = toNumber(summary.attention?.awaiting_rider);
  const failedToday = toNumber(summary.totals?.delivery_failed);
  const riders = summary.riders ?? [];

  return (
    <Card>
      <Text style={styles.title}>Waiting on you</Text>
      <View style={styles.rows}>
        <KeyValueRow
          label="Awaiting acceptance"
          value={String(awaitingAcceptance)}
          tone={awaitingAcceptance > 0 ? 'warn' : 'neutral'}
        />
        <KeyValueRow
          label="Accepted, no rider yet"
          value={String(awaitingRider)}
          tone={awaitingRider > 0 ? 'warn' : 'neutral'}
        />
        <KeyValueRow
          label="Delivery failed today"
          value={String(failedToday)}
          tone={failedToday > 0 ? 'debit' : 'neutral'}
        />
      </View>

      {riders.length > 0 && (
        <View style={styles.riders}>
          <Text style={styles.kicker}>Riders today</Text>
          {riders.map(rider => {
            const failed = toNumber(rider.delivery_failed);
            const line = [
              `${toNumber(rider.delivered)} done`,
              `${toNumber(rider.out_for_delivery)} out`,
              `${toNumber(rider.pending_pickup)} to collect`,
              failed > 0 ? `${failed} failed` : null,
            ]
              .filter(Boolean)
              .join(' · ');
            return (
              <View key={rider.id} style={styles.riderRow}>
                <Text style={styles.riderName} numberOfLines={1}>
                  {rider.name ?? `Rider #${rider.id}`}
                  {!!rider.status && rider.status !== 'active' && (
                    <Text style={styles.riderStatus}>
                      {'  '}
                      {statusLabel(rider.status)}
                    </Text>
                  )}
                </Text>
                <Text style={styles.riderStats}>{line}</Text>
              </View>
            );
          })}
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  title: {fontSize: 14.5, fontWeight: '800', color: Colors.text},
  rows: {gap: 8, marginTop: 11},
  riders: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSoft,
    gap: 9,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: Colors.textMuted,
  },
  riderRow: {gap: 2},
  riderName: {fontSize: 13.5, fontWeight: '800', color: Colors.text},
  riderStatus: {fontSize: 11, fontWeight: '700', color: Colors.textMuted},
  riderStats: {fontSize: 12, color: Colors.textSecondary},
});

export default AttentionCard;
