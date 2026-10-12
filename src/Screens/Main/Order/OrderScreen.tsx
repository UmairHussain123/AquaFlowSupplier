import React, {useCallback, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {useDispatch, useSelector} from 'react-redux';
import LinearGradient from 'react-native-linear-gradient';
import Toast from 'react-native-toast-message';

import {Colors} from '../../../Constant/Colors';
import Route from '../../../Constant/NavigationStrings';
import AppButton from '../../../Component/Common/AppButton';
import AppInput from '../../../Component/Common/AppInput';
import ChipGroup, {type ChipOption} from '../../../Component/Common/ChipGroup';
import EmptyState from '../../../Component/Common/EmptyState';
import InfoNote from '../../../Component/Common/InfoNote';
import LoadMoreFooter from '../../../Component/Common/LoadMoreFooter';
import OrderCard from '../../../Component/Cards/OrderCard';
import ScreenLoader from '../../../Component/Common/ScreenLoader';
import {PlusIcon} from '../../../Component/Icons/TabIcons';
import {PAYMENT_STATUSES} from '../../../Component/Order/orderTones';
import {useActiveShopId} from '../../../hooks/useActiveShop';
import {useDebounce} from '../../../hooks/useDebounce';
import {useSupplierRoles} from '../../../hooks/useSupplierRoles';
import {setOrderTab} from '../../../Redux/slices/filterSlice';
import {
  acceptOrder,
  listShopOrders,
  orderTabKey,
} from '../../../Server/Order/OrdersApi';
import {
  ORDER_TABS,
  type OrderListItem,
  type OrderListParams,
} from '../../../Server/Order/OrderType';
import dayjs from '../../../helper/dateHelper';
import {apiErrorMessage, statusLabel} from '../../../helper/helperFunction';

/**
 * SB2 — the order inbox.
 *
 * One request pulls a page of the shop's orders and the tabs partition it
 * locally. Querying per status instead meant up to nine parallel requests per
 * load (one per status in the tab, plus one per tab for the counters), and a
 * single one of them failing took the whole `Promise.all` down — so the list
 * came back empty at random. It also made switching tabs a network round trip.
 *
 * Search, payment status and date range are server-side filters (as on the
 * portal), so they narrow that one request rather than the tabs.
 */
const PAGE_SIZE = 100;

const ANY_PAYMENT = 'any';

const PAYMENT_FILTERS: ChipOption<string>[] = [
  {value: ANY_PAYMENT, label: 'Any payment'},
  ...PAYMENT_STATUSES.map(status => ({value: status, label: statusLabel(status)})),
];

/** Days back from today; 0 means all time. The portal defaults to 30. */
const DATE_RANGES: ChipOption<number>[] = [
  {value: 7, label: 'Last 7 days'},
  {value: 30, label: 'Last 30 days'},
  {value: 90, label: 'Last 90 days'},
  {value: 0, label: 'All time'},
];

/** Built per request so `date_from` never goes stale across midnight. */
const listParams = (
  search: string,
  paymentStatus: string,
  rangeDays: number,
  page: number,
): OrderListParams => ({
  search: search || undefined,
  payment_status: paymentStatus === ANY_PAYMENT ? undefined : paymentStatus,
  date_from: rangeDays
    ? dayjs().subtract(rangeDays, 'day').format('YYYY-MM-DD')
    : undefined,
  per_page: PAGE_SIZE,
  page,
  sort_by: 'created_at',
  sort_order: 'desc',
});

const OrderScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const shopId = useActiveShopId();
  const {isShopManager} = useSupplierRoles();
  const activeTab = useSelector((state: any) => state.filter.orderTab);

  const [searchInput, setSearchInput] = useState('');
  const search = useDebounce(searchInput.trim(), 400);
  const [paymentStatus, setPaymentStatus] = useState<string>(ANY_PAYMENT);
  const [rangeDays, setRangeDays] = useState<number>(30);

  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [paging, setPaging] = useState({current: 1, last: 1, total: 0});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  // Only the newest request may write to state — a slow earlier one landing
  // late would otherwise overwrite fresher data.
  const requestIdRef = useRef(0);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!shopId) {
        setLoading(false);
        return;
      }

      const requestId = ++requestIdRef.current;
      if (isRefresh) setRefreshing(true);
      else setFetching(true);

      try {
        const page = await listShopOrders(
          shopId,
          listParams(search, paymentStatus, rangeDays, 1),
        );

        if (requestId !== requestIdRef.current) return;
        const rows = page.data ?? [];
        setOrders(rows);
        setPaging({
          current: page.current_page ?? 1,
          last: page.last_page ?? 1,
          total: page.total ?? rows.length,
        });
        setError(null);
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        const message = apiErrorMessage(err, 'Could not load your orders.');
        setError(message);
        Toast.show({type: 'error', text1: message});
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setFetching(false);
          setRefreshing(false);
        }
      }
    },
    [paymentStatus, rangeDays, search, shopId],
  );

  // Re-runs on focus and whenever a filter changes `load`.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  /** Appends the next page; dropped if a fresh load started meanwhile. */
  const loadMore = async () => {
    if (!shopId || loadingMore || paging.current >= paging.last) return;
    const requestId = requestIdRef.current;
    setLoadingMore(true);

    try {
      const page = await listShopOrders(
        shopId,
        listParams(search, paymentStatus, rangeDays, paging.current + 1),
      );
      if (requestId !== requestIdRef.current) return;

      // New orders arriving shift the pages, so the next one can repeat rows.
      setOrders(prev => {
        const seen = new Set(prev.map(order => order.id));
        return [...prev, ...(page.data ?? []).filter(order => !seen.has(order.id))];
      });
      setPaging(prev => ({
        current: page.current_page ?? prev.current + 1,
        last: page.last_page ?? prev.last,
        total: page.total ?? prev.total,
      }));
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: apiErrorMessage(err, 'Could not load more orders.'),
      });
    } finally {
      setLoadingMore(false);
    }
  };

  /** Every tab's rows, worked out once per fetch rather than per tab press. */
  const byTab = useMemo(() => {
    const buckets: Record<string, OrderListItem[]> = {};
    ORDER_TABS.forEach(tab => {
      buckets[tab.key] = [];
    });
    orders.forEach(order => {
      const key = orderTabKey(order.order_status);
      (buckets[key] ??= []).push(order);
    });
    buckets.all = orders;
    return buckets;
  }, [orders]);

  const visible = byTab[activeTab] ?? [];
  const filtered =
    !!search || paymentStatus !== ANY_PAYMENT || rangeDays !== 30;
  const hasMore = paging.current < paging.last;

  const onAccept = async (orderId: number) => {
    if (!shopId) return;
    setBusyId(orderId);
    try {
      const updated = await acceptOrder(shopId, orderId);
      // Patch the row in place so it moves tab immediately, then refresh in the
      // background — the supplier shouldn't wait on a round trip to see it go.
      setOrders(prev =>
        prev.map(order =>
          order.id === orderId
            ? {...order, order_status: updated?.order_status ?? 'accepted'}
            : order,
        ),
      );
      Toast.show({type: 'success', text1: 'Order accepted'});
      load(true);
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: apiErrorMessage(err, 'Could not accept the order.'),
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Orders</Text>
          {/* Placing an order for a customer is owner / manager only. */}
          {isShopManager && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => navigation.navigate(Route.NewOrderScreen, {})}
              style={styles.add}>
              <LinearGradient
                colors={[Colors.gradFrom, Colors.gradTo]}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />
              <PlusIcon color={Colors.white} size={14} />
              <Text style={styles.addText}>New order</Text>
            </TouchableOpacity>
          )}
          {/* The two apps look alike on a test device — this says which is open. */}
          <Text style={styles.appTag}>Supplier</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabs}>
          {ORDER_TABS.map(tab => {
            const active = tab.key === activeTab;
            // "Done" is a history bucket, so a count there means nothing.
            const count = tab.key === 'done' ? 0 : byTab[tab.key]?.length ?? 0;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => dispatch(setOrderTab(tab.key))}
                style={[styles.tab, active && styles.tabActive]}>
                {active && (
                  <LinearGradient
                    colors={[Colors.gradFrom, Colors.gradTo]}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 1}}
                    style={StyleSheet.absoluteFill}
                    pointerEvents="none"
                  />
                )}
                <Text style={[styles.tabText, active && styles.tabTextActive]}>
                  {tab.label}
                  {count ? ` · ${count}` : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <ScreenLoader />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
          }
          ListHeaderComponent={
            <View style={styles.filters}>
              <View style={styles.searchRow}>
                <AppInput
                  value={searchInput}
                  onChangeText={setSearchInput}
                  placeholder="Order number, name or phone"
                  autoCapitalize="none"
                  style={styles.flex}
                />
                {fetching && (
                  <ActivityIndicator color={Colors.primary} size="small" />
                )}
              </View>
              <ChipGroup
                options={PAYMENT_FILTERS}
                value={paymentStatus}
                onChange={next => setPaymentStatus(next ?? ANY_PAYMENT)}
                required
              />
              <ChipGroup
                options={DATE_RANGES}
                value={rangeDays}
                onChange={next => setRangeDays(next ?? 30)}
                required
              />
            </View>
          }
          renderItem={({item}) => (
            <OrderCard
              order={item}
              busy={busyId === item.id}
              onPress={() =>
                navigation.navigate(Route.OrderDetailScreen, {orderId: item.id})
              }
              // Accept / reject is the shop's call — a rider never sees the pair.
              onAccept={isShopManager ? () => onAccept(item.id) : undefined}
              onReject={
                isShopManager
                  ? () =>
                      navigation.navigate(Route.OrderDetailScreen, {
                        orderId: item.id,
                        reject: true,
                      })
                  : undefined
              }
            />
          )}
          ListEmptyComponent={
            // While a filter change is in flight the spinner by the search box says so.
            fetching ? undefined : error ? (
              <View style={styles.errorState}>
                <EmptyState title="Couldn't load your orders" message={error} />
                <AppButton
                  title="Try again"
                  variant="secondary"
                  onPress={() => load(true)}
                  block={false}
                  style={styles.retry}
                />
              </View>
            ) : (
              <EmptyState
                title="Nothing here yet"
                message={
                  filtered
                    ? 'No orders in this tab match your search and filters.'
                    : activeTab === 'new'
                    ? 'New orders appear the moment a customer places one.'
                    : activeTab === 'all'
                    ? 'Every order this shop has taken shows up here.'
                    : 'No orders in this stage right now.'
                }
              />
            )
          }
          ListFooterComponent={
            <View style={styles.footer}>
              {/* The tabs only see the pages fetched so far — say so rather than drop the rest. */}
              {hasMore && (
                <LoadMoreFooter
                  shown={orders.length}
                  total={paging.total}
                  hasMore={hasMore}
                  loading={loadingMore}
                  onLoadMore={loadMore}
                  noun="orders in this range"
                />
              )}
              {isShopManager && activeTab === 'new' && visible.length > 0 && (
                <InfoNote tone="neutral">
                  Accept quickly — a customer waiting too long will move to
                  another shop, and repeated misses pause your listing.
                </InfoNote>
              )}
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.surface},
  flex: {flex: 1},
  header: {
    backgroundColor: Colors.white,
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.6,
    color: Colors.text,
  },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    borderRadius: 13,
    paddingHorizontal: 13,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOpacity: 0.26,
    shadowRadius: 18,
    shadowOffset: {width: 0, height: 8},
    elevation: 3,
  },
  addText: {color: Colors.white, fontSize: 13, fontWeight: '800'},
  appTag: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: Colors.slate,
    backgroundColor: Colors.surface3,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  tabs: {gap: 8, paddingHorizontal: 20},
  tab: {
    height: 36,
    paddingHorizontal: 15,
    borderRadius: 999,
    backgroundColor: Colors.surface3,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  tabActive: {backgroundColor: Colors.primary},
  tabText: {fontSize: 13, fontWeight: '700', color: Colors.slate},
  tabTextActive: {fontWeight: '800', color: Colors.white},

  body: {padding: 18, gap: 12, paddingBottom: 30},
  filters: {gap: 10, marginBottom: 2},
  searchRow: {flexDirection: 'row', alignItems: 'center', gap: 10},
  footer: {gap: 12},
  errorState: {alignItems: 'center'},
  retry: {paddingHorizontal: 22, marginTop: -14},
});

export default OrderScreen;
