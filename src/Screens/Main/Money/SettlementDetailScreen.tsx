import React, {useCallback, useState} from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import Toast from 'react-native-toast-message';

import {Colors} from '../../../Constant/Colors';
import {Fonts} from '../../../Constant/Fonts';
import Route from '../../../Constant/NavigationStrings';
import AppHeader from '../../../Component/Common/AppHeader';
import Card from '../../../Component/Common/Card';
import EmptyState from '../../../Component/Common/EmptyState';
import InfoNote from '../../../Component/Common/InfoNote';
import ScreenLoader from '../../../Component/Common/ScreenLoader';
import {ChevronRight} from '../../../Component/Icons/TabIcons';
import PayoutCard from '../../../Component/Money/PayoutCard';
import SettlementBreakdown from '../../../Component/Money/SettlementBreakdown';
import SettlementHero from '../../../Component/Money/SettlementHero';
import {useSupplierRoles} from '../../../hooks/useSupplierRoles';
import {
  apiErrorMessage,
  formatMoney,
  statusLabel,
} from '../../../helper/helperFunction';
import dayjs from '../../../helper/dateHelper';
import {
  formatPeriod,
  getSettlement,
  type Payout,
  type SettlementDetail,
  type SettlementLine,
} from '../../../Server/Settlements/SettlementsApi';

/** Newest payout first; ones without a paid date fall back to when they were raised. */
const byNewest = (a: Payout, b: Payout) =>
  dayjs(b.paid_at ?? b.created_at).valueOf() -
  dayjs(a.paid_at ?? a.created_at).valueOf();

/** One order's share of the settlement: gross, commission taken and net. */
const LineRow: React.FC<{
  line: SettlementLine;
  last: boolean;
  onPress: () => void;
}> = ({line, last, onPress}) => (
  <TouchableOpacity
    activeOpacity={0.7}
    onPress={onPress}
    style={[styles.line, !last && styles.lineDivider]}>
    <View style={styles.flex}>
      <View style={styles.lineTop}>
        <Text style={styles.orderNumber} numberOfLines={1}>
          {line.order?.order_number ?? `Order #${line.order_id}`}
        </Text>
        <Text style={styles.lineNet}>{formatMoney(line.net_amount)}</Text>
      </View>
      <Text style={styles.lineMeta} numberOfLines={1}>
        Gross {formatMoney(line.gross_amount)} ·{' '}
        <Text style={styles.debit}>
          − {formatMoney(line.commission_amount)}
        </Text>
        {line.order?.order_status
          ? ` · ${statusLabel(line.order.order_status)}`
          : ''}
      </Text>
    </View>
    <ChevronRight color={Colors.textMuted} size={15} />
  </TouchableOpacity>
);

/** One settlement in full: the breakdown, its payouts and the orders in it. Owner only. */
const SettlementDetailScreen: React.FC<{navigation: any; route: any}> = ({
  navigation,
  route,
}) => {
  const settlementId: number | undefined = route?.params?.settlementId;
  const {isOwner} = useSupplierRoles();

  const [settlement, setSettlement] = useState<SettlementDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!isOwner || !settlementId) {
        setLoading(false);
        return;
      }
      if (isRefresh) setRefreshing(true);

      try {
        setSettlement(await getSettlement(settlementId));
        setError(null);
      } catch (err) {
        const message = apiErrorMessage(err, 'Could not load this settlement.');
        setError(message);
        Toast.show({type: 'error', text1: message});
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isOwner, settlementId],
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!isOwner) {
    return (
      <View style={styles.screen}>
        <AppHeader title="Settlement" />
        <EmptyState
          title="Only the owner can see this"
          message="Settlements and payouts are visible to the supplier account owner only."
        />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.screen}>
        <AppHeader title="Settlement" />
        <ScreenLoader />
      </View>
    );
  }

  if (!settlement) {
    return (
      <View style={styles.screen}>
        <AppHeader title="Settlement" />
        <EmptyState
          title="Couldn't load this settlement"
          message={error ?? 'It may have been removed.'}
          actionLabel="Try again"
          onAction={() => {
            setLoading(true);
            load();
          }}
        />
      </View>
    );
  }

  const lines = settlement.lines ?? [];
  const payouts = [...(settlement.payouts ?? [])].sort(byNewest);

  return (
    <View style={styles.screen}>
      <AppHeader
        title="Settlement"
        subtitle={formatPeriod(settlement.period_start, settlement.period_end)}
      />

      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
          />
        }>
        <SettlementHero settlement={settlement} ordersCount={lines.length} />
        <SettlementBreakdown settlement={settlement} />

        <Text style={styles.sectionTitle}>
          Payouts
          {payouts.length ? (
            <Text style={styles.sectionCount}> {payouts.length}</Text>
          ) : null}
        </Text>
        {payouts.length ? (
          payouts.map(payout => <PayoutCard key={payout.id} payout={payout} />)
        ) : (
          <InfoNote tone="neutral">
            No payout recorded against this settlement yet.
          </InfoNote>
        )}

        <Text style={styles.sectionTitle}>
          Orders in this settlement
          <Text style={styles.sectionCount}> {lines.length}</Text>
        </Text>
        {lines.length ? (
          <Card flush>
            {lines.map((line, index) => (
              <LineRow
                key={line.id}
                line={line}
                last={index === lines.length - 1}
                onPress={() =>
                  navigation.navigate(Route.OrderDetailScreen, {
                    orderId: line.order_id,
                  })
                }
              />
            ))}
          </Card>
        ) : (
          <InfoNote tone="neutral">
            No order lines returned for this settlement.
          </InfoNote>
        )}

        <InfoNote>
          Orders from every shop on your profile are settled together. An order
          opens against the shop you have selected, so switch shops first if it
          belongs to another one.
        </InfoNote>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.surface},
  flex: {flex: 1},
  body: {padding: 18, gap: 12, paddingBottom: 30},

  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.text,
    marginTop: 4,
  },
  sectionCount: {fontSize: 13, fontWeight: '700', color: Colors.textMuted},

  line: {
    paddingHorizontal: 15,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  lineDivider: {borderBottomWidth: 1, borderBottomColor: Colors.borderSoft2},
  lineTop: {flexDirection: 'row', alignItems: 'baseline', gap: 10},
  orderNumber: {
    flex: 1,
    fontFamily: Fonts.mono,
    fontSize: 13.5,
    fontWeight: '700',
    color: Colors.primary,
  },
  lineNet: {
    fontFamily: Fonts.mono,
    fontSize: 13.5,
    fontWeight: '800',
    color: Colors.text,
  },
  lineMeta: {fontSize: 12, color: Colors.textSecondary, marginTop: 4},
  debit: {color: Colors.danger},
});

export default SettlementDetailScreen;
