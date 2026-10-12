import React, {useCallback, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import Toast from 'react-native-toast-message';

import {Colors} from '../../../Constant/Colors';
import {Fonts} from '../../../Constant/Fonts';
import Route from '../../../Constant/NavigationStrings';
import AppHeader from '../../../Component/Common/AppHeader';
import AppInput from '../../../Component/Common/AppInput';
import Card from '../../../Component/Common/Card';
import ChipGroup from '../../../Component/Common/ChipGroup';
import EmptyState from '../../../Component/Common/EmptyState';
import InfoNote from '../../../Component/Common/InfoNote';
import LoadMoreFooter from '../../../Component/Common/LoadMoreFooter';
import ScreenLoader from '../../../Component/Common/ScreenLoader';
import ContainerTransactionCard from '../../../Component/Catalog/ContainerTransactionCard';
import ReconcileSheet from '../../../Component/Catalog/ReconcileSheet';
import {usePagedList} from '../../../hooks/usePagedList';
import {useActiveShopId} from '../../../hooks/useActiveShop';
import {useDebounce} from '../../../hooks/useDebounce';
import {useSupplierRoles} from '../../../hooks/useSupplierRoles';
import {formatMoney} from '../../../helper/helperFunction';
import {
  CONTAINER_TABS,
  getContainerSummary,
  listContainerTransactions,
  type ContainerSummary,
  type ContainerTransaction,
} from '../../../Server/Container/ContainerTransactionsApi';

const PER_PAGE = 15;

/**
 * Jar deposits — the returnable jars out with customers and the deposit held
 * against them, one record per order. Owners and managers only.
 *
 * A pending record is reconciled here once the rider reports what came back;
 * after that only Aqua Flow can change it.
 */
const ContainerLedgerScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const shopId = useActiveShopId();
  const {isShopManager} = useSupplierRoles();

  const [tab, setTab] = useState(CONTAINER_TABS[0].key);
  const [searchInput, setSearchInput] = useState('');
  const [summary, setSummary] = useState<ContainerSummary | null>(null);
  const [reconciling, setReconciling] = useState<ContainerTransaction | null>(
    null,
  );

  const search = useDebounce(searchInput.trim(), 350);
  const status = CONTAINER_TABS.find(option => option.key === tab)?.status;

  const fetchPage = useMemo(
    () =>
      shopId && isShopManager
        ? (page: number) =>
            listContainerTransactions(shopId, {
              status,
              search: search || undefined,
              per_page: PER_PAGE,
              page,
            })
        : null,
    [isShopManager, search, shopId, status],
  );

  const list = usePagedList<ContainerTransaction>(
    fetchPage,
    JSON.stringify({shopId, status, search}),
    "Couldn't load jar deposits.",
  );
  const {reload} = list;

  // The headline numbers are a nice-to-have — the list works without them.
  const loadSummary = useCallback(async () => {
    if (!shopId || !isShopManager) return;
    try {
      setSummary(await getContainerSummary(shopId));
    } catch {
      setSummary(null);
    }
  }, [isShopManager, shopId]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  useFocusEffect(
    useCallback(() => {
      loadSummary();
    }, [loadSummary]),
  );

  const refresh = () => {
    reload('refresh');
    loadSummary();
  };

  if (!isShopManager) {
    return (
      <View style={styles.screen}>
        <AppHeader title="Jar deposits" />
        <EmptyState
          title="Jar deposits are for owners and managers"
          message="The shop owner or a manager reconciles the jars that come back from customers."
        />
      </View>
    );
  }

  if (!shopId) {
    return (
      <View style={styles.screen}>
        <AppHeader title="Jar deposits" />
        <EmptyState
          title="No shop selected"
          message="Pick a shop on the Shop tab to see its jar deposits."
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <AppHeader
        title="Jar deposits"
        subtitle="Returnable jars out with customers"
      />

      {list.loading ? (
        <ScreenLoader />
      ) : (
        <FlatList
          data={list.rows}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={list.refreshing} onRefresh={refresh} />
          }
          ListHeaderComponent={
            <View style={styles.filters}>
              {!!summary && (
                <Card>
                  <View style={styles.totals}>
                    <View style={styles.flex}>
                      <Text style={styles.totalLabel}>Jars still out</Text>
                      <Text style={styles.totalValue}>
                        {summary.outstandingJars}
                      </Text>
                    </View>
                    <View style={styles.flex}>
                      <Text style={styles.totalLabel}>Deposit held</Text>
                      <Text style={styles.totalValue}>
                        {formatMoney(summary.depositHeld)}
                      </Text>
                    </View>
                    <View style={styles.flex}>
                      <Text style={styles.totalLabel}>To reconcile</Text>
                      <Text style={styles.totalValue}>
                        {summary.pendingCount}
                      </Text>
                    </View>
                  </View>
                </Card>
              )}

              <ChipGroup
                options={CONTAINER_TABS.map(option => ({
                  value: option.key,
                  label: option.label,
                }))}
                value={tab}
                onChange={next => next && setTab(next)}
                required
              />

              <AppInput
                value={searchInput}
                onChangeText={setSearchInput}
                placeholder="Customer or order number"
                autoCapitalize="none"
              />

              <View style={styles.countRow}>
                <Text style={styles.count}>
                  {list.total} record{list.total === 1 ? '' : 's'}
                </Text>
                {list.fetching && (
                  <ActivityIndicator color={Colors.primary} size="small" />
                )}
              </View>
            </View>
          }
          renderItem={({item}) => (
            <ContainerTransactionCard
              transaction={item}
              onOpenOrder={() =>
                navigation.navigate(Route.OrderDetailScreen, {
                  orderId: item.order_id,
                })
              }
              onReconcile={() => setReconciling(item)}
            />
          )}
          ListEmptyComponent={
            list.error ? (
              <EmptyState
                title="Couldn't load jar deposits"
                message={list.error}
                actionLabel="Try again"
                onAction={refresh}
              />
            ) : (
              <EmptyState
                title={
                  search
                    ? 'Nothing matches that search'
                    : status === 'pending'
                    ? 'Nothing waiting to be reconciled'
                    : 'No jar deposits here'
                }
                message={
                  search
                    ? 'Try a customer name or a full order number.'
                    : 'Records appear once a delivered order carries a returnable jar.'
                }
              />
            )
          }
          ListFooterComponent={
            <View style={styles.footer}>
              <LoadMoreFooter
                shown={list.rows.length}
                total={list.total}
                hasMore={list.hasMore}
                loading={list.loadingMore}
                onLoadMore={list.loadMore}
                noun="records"
              />
              <InfoNote>
                Record what actually came back when a delivery is made. A
                reconciled record is final for the shop — if a count was wrong,
                raise a dispute or contact Aqua Flow support.
              </InfoNote>
            </View>
          }
        />
      )}

      {!!reconciling && (
        <ReconcileSheet
          shopId={shopId}
          transaction={reconciling}
          onClose={() => setReconciling(null)}
          onSaved={() => {
            setReconciling(null);
            Toast.show({type: 'success', text1: 'Jar return recorded'});
            reload();
            loadSummary();
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.surface},
  flex: {flex: 1},
  body: {padding: 20, gap: 12, paddingBottom: 30},
  filters: {gap: 10, marginBottom: 2},

  totals: {flexDirection: 'row', gap: 12},
  totalLabel: {fontSize: 11.5, color: Colors.textMuted, fontWeight: '700'},
  totalValue: {
    fontFamily: Fonts.mono,
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    marginTop: 3,
  },

  countRow: {flexDirection: 'row', alignItems: 'center', gap: 10},
  count: {fontSize: 12.5, fontWeight: '700', color: Colors.textSecondary},
  footer: {gap: 12},
});

export default ContainerLedgerScreen;
