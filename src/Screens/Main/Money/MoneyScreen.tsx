import React, {useCallback, useState} from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import Toast from 'react-native-toast-message';

import {Colors} from '../../../Constant/Colors';
import Route from '../../../Constant/NavigationStrings';
import Card from '../../../Component/Common/Card';
import EmptyState from '../../../Component/Common/EmptyState';
import InfoNote from '../../../Component/Common/InfoNote';
import ScreenLoader from '../../../Component/Common/ScreenLoader';
import SectionHeader from '../../../Component/Common/SectionHeader';
import {ChevronRight} from '../../../Component/Icons/TabIcons';
import PayoutAccountBadges from '../../../Component/Money/PayoutAccountBadges';
import PayoutCard from '../../../Component/Money/PayoutCard';
import SettlementBreakdown from '../../../Component/Money/SettlementBreakdown';
import SettlementHero from '../../../Component/Money/SettlementHero';
import SettlementRow from '../../../Component/Money/SettlementRow';
import {useSupplierRoles} from '../../../hooks/useSupplierRoles';
import {apiErrorMessage} from '../../../helper/helperFunction';
import {
  describeAccount,
  getSettlement,
  isAccountLocked,
  latestPayout,
  listPayoutAccounts,
  listSettlements,
  type ManagedPayoutAccount,
  type Settlement,
  type SettlementDetail,
} from '../../../Server/Settlements/SettlementsApi';

/** How many settlements the tab lists before "All statements". */
const RECENT_COUNT = 5;

/**
 * SB6 — Money. Owner only.
 *
 * Everything here comes from Aqua Flow's settlements: the newest one is the
 * hero (fetched in full for its payouts), the next few are listed, and the
 * payout account card leads to the accounts screen. A settlement covers every
 * shop on the supplier profile, not just the selected one.
 */
const MoneyScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const {isOwner} = useSupplierRoles();

  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [detail, setDetail] = useState<SettlementDetail | null>(null);
  const [detailFailed, setDetailFailed] = useState(false);
  /** `null` when the accounts call failed — the card says so instead of "none". */
  const [accounts, setAccounts] = useState<ManagedPayoutAccount[] | null>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!isOwner) {
        setLoading(false);
        return;
      }
      if (isRefresh) setRefreshing(true);

      try {
        // The settlements are the point of the screen — render them even if
        // the payout accounts call behind them fails.
        const [page, payoutAccounts] = await Promise.allSettled([
          listSettlements({per_page: RECENT_COUNT, page: 1}),
          listPayoutAccounts(),
        ]);
        setAccounts(
          payoutAccounts.status === 'fulfilled' ? payoutAccounts.value : null,
        );

        if (page.status === 'rejected') throw page.reason;
        const rows = page.value.data ?? [];
        setSettlements(rows);
        setError(null);

        // List rows carry no payouts, so the newest is fetched in full. A
        // failure here leaves the summary on screen.
        if (rows[0]) {
          try {
            setDetail(await getSettlement(rows[0].id));
            setDetailFailed(false);
          } catch {
            setDetail(null);
            setDetailFailed(true);
          }
        } else {
          setDetail(null);
          setDetailFailed(false);
        }
      } catch (err) {
        const message = apiErrorMessage(err, 'Could not load your earnings.');
        setError(message);
        Toast.show({type: 'error', text1: message});
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isOwner],
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const openSettlement = (settlementId: number) =>
    navigation.navigate(Route.SettlementDetailScreen, {settlementId});

  const latest = settlements[0] ?? null;
  const latestDetail =
    detail && latest && detail.id === latest.id ? detail : null;
  const payout = latestPayout(latestDetail?.payouts);

  const primary =
    accounts?.find(account => account.is_verified) ?? accounts?.[0] ?? null;

  const header = (
    <View style={styles.header}>
      <Text style={styles.title}>Money</Text>
      <Text style={styles.subtitle}>Settlements across all your shops</Text>
    </View>
  );

  if (!isOwner) {
    return (
      <View style={styles.screen}>
        {header}
        <EmptyState
          title="Only the owner can see this"
          message="Earnings, settlements and payout accounts are visible to the supplier account owner only."
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {header}

      {loading ? (
        <ScreenLoader />
      ) : (
        <ScrollView
          contentContainerStyle={styles.body}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
            />
          }>
          {latest ? (
            <>
              <SectionHeader
                title="Latest settlement"
                actionLabel="Details"
                onAction={() => openSettlement(latest.id)}
              />

              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => openSettlement(latest.id)}>
                <SettlementHero
                  settlement={latest}
                  ordersCount={latestDetail?.lines?.length}
                />
              </TouchableOpacity>

              <SettlementBreakdown settlement={latest} />

              {payout ? (
                <PayoutCard payout={payout} />
              ) : (
                <InfoNote tone="neutral">
                  {detailFailed
                    ? "Couldn't load the payout for this settlement. Pull down to try again."
                    : 'No payout recorded against this settlement yet.'}
                </InfoNote>
              )}

              <SectionHeader
                title="Recent settlements"
                actionLabel="All statements"
                onAction={() => navigation.navigate(Route.StatementsScreen)}
              />
              <Card flush>
                {settlements.map((row, index) => (
                  <SettlementRow
                    key={row.id}
                    settlement={row}
                    last={index === settlements.length - 1}
                    onPress={() => openSettlement(row.id)}
                  />
                ))}
              </Card>
            </>
          ) : error ? (
            <EmptyState
              title="Couldn't load your earnings"
              message={error}
              actionLabel="Try again"
              onAction={() => load()}
            />
          ) : (
            <EmptyState
              title="No settlements yet"
              message="Aqua Flow settles completed orders on a weekly cycle. Your first statement appears here once a cycle closes."
            />
          )}

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => navigation.navigate(Route.PayoutAccountsScreen)}>
            <Card>
              <View style={styles.payoutRow}>
                <View style={styles.flex}>
                  <Text style={styles.payoutTitle}>Payout account</Text>
                  {accounts === null ? (
                    <Text style={styles.payoutSub}>
                      Couldn't load your accounts — tap to manage them.
                    </Text>
                  ) : primary ? (
                    <>
                      <Text style={styles.payoutSub} numberOfLines={2}>
                        {[
                          primary.account_title,
                          describeAccount(primary) ?? primary.wallet_provider,
                        ]
                          .filter(Boolean)
                          .join(' · ') || 'No bank details'}
                      </Text>
                      <View style={styles.payoutBadges}>
                        <PayoutAccountBadges
                          verified={primary.is_verified}
                          locked={isAccountLocked(primary)}
                        />
                      </View>
                      {!primary.is_verified && (
                        <Text style={styles.payoutWarning}>
                          Not verified yet — payouts stay on hold until Aqua
                          Flow verifies this account.
                        </Text>
                      )}
                      {accounts.length > 1 && (
                        <Text style={styles.payoutMore}>
                          +{accounts.length - 1} more on file
                        </Text>
                      )}
                    </>
                  ) : (
                    <Text style={styles.payoutSub}>
                      No payout account yet — add the bank account or wallet you
                      want settlements paid into.
                    </Text>
                  )}
                </View>
                <ChevronRight color={Colors.textMuted} size={16} />
              </View>
            </Card>
          </TouchableOpacity>

          <InfoNote>
            One settlement covers every shop on your supplier profile. Aqua Flow
            works out the commission per order — each statement shows exactly
            what was deducted.
          </InfoNote>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.surface},
  flex: {flex: 1},
  header: {
    backgroundColor: Colors.white,
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 12,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    shadowColor: 'rgba(11,27,43,1)',
    shadowOpacity: 0.05,
    shadowRadius: 22,
    shadowOffset: {width: 0, height: 8},
    elevation: 3,
    zIndex: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.6,
    color: Colors.text,
  },
  subtitle: {fontSize: 12.5, color: Colors.textSecondary, marginTop: 3},
  body: {paddingHorizontal: 18, paddingTop: 16, paddingBottom: 30, gap: 12},

  payoutRow: {flexDirection: 'row', alignItems: 'center', gap: 12},
  payoutTitle: {fontSize: 14, fontWeight: '800', color: Colors.text},
  payoutSub: {fontSize: 12.5, color: Colors.textSecondary, marginTop: 3},
  payoutBadges: {marginTop: 9},
  payoutWarning: {
    fontSize: 12,
    color: Colors.warningText,
    fontWeight: '600',
    marginTop: 8,
    lineHeight: 17,
  },
  payoutMore: {fontSize: 12, color: Colors.textMuted, marginTop: 6},
});

export default MoneyScreen;
