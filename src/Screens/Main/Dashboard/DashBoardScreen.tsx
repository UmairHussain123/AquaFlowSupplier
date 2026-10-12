import React, {useCallback, useMemo, useRef, useState} from 'react';
import {
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import {useDispatch, useSelector} from 'react-redux';
import Toast from 'react-native-toast-message';

import {Colors} from '../../../Constant/Colors';
import Route from '../../../Constant/NavigationStrings';
import AppButton from '../../../Component/Common/AppButton';
import Card from '../../../Component/Common/Card';
import EmptyState from '../../../Component/Common/EmptyState';
import InfoNote from '../../../Component/Common/InfoNote';
import ScreenLoader from '../../../Component/Common/ScreenLoader';
import SectionHeader from '../../../Component/Common/SectionHeader';
import ShopStatusPill from '../../../Component/Common/ShopStatusPill';
import StatusBanners from '../../../Component/Common/StatusBanners';
import OrderCard from '../../../Component/Cards/OrderCard';
import {HeaderStat} from '../../../Component/Cards/StatTile';
import AttentionCard from '../../../Component/Dashboard/AttentionCard';
import BellButton from '../../../Component/Dashboard/BellButton';
import OpenDisputesCard from '../../../Component/Dashboard/OpenDisputesCard';
import RestockCard from '../../../Component/Dashboard/RestockCard';
import RetryBanner from '../../../Component/Dashboard/RetryBanner';
import {RippleArt} from '../../../Component/Icons/Illustrations';
import {useActiveShopId} from '../../../hooks/useActiveShop';
import {useSupplierRoles} from '../../../hooks/useSupplierRoles';
import {useUnreadNotifications} from '../../../hooks/useUnreadNotifications';
import {setCatalogLowStock} from '../../../Redux/slices/filterSlice';
import {
  selectActiveShop,
  setShops,
  shopStatusLabel,
  upsertShop,
} from '../../../Redux/slices/shopSlice';
import {selectUser} from '../../../Redux/slices/userSlice';
import {listShops, setShopOpenState} from '../../../Server/Shops/ShopsApi';
import {
  getSupplierDashboard,
  type SupplierDashboard,
} from '../../../Server/Dashboard/SupplierDashboardApi';
import {acceptOrder, listShopOrders} from '../../../Server/Order/OrdersApi';
import type {OrderListItem, OrderStatus} from '../../../Server/Order/OrderType';
import {
  listShopProducts,
  type ShopProduct,
} from '../../../Server/Product/ProductsApi';
import {
  isDisputeLive,
  listShopDisputes,
} from '../../../Server/Disputes/DisputesApi';
import {isToday} from '../../../helper/dateHelper';
import {
  apiErrorMessage,
  formatMoney,
  toNumber,
} from '../../../helper/helperFunction';

/** Orders still needing the shop (or the rider) to do something. */
const ACTIONABLE: OrderStatus[] = [
  'placed',
  'accepted',
  'preparing',
  'out_for_delivery',
];
/** Orders that count as money earned. */
const EARNED: OrderStatus[] = ['delivered', 'completed'];
/** How many open orders the dashboard lists before "See all". */
const NEEDS_ACTION_LIMIT = 8;

const sumTotals = (orders: OrderListItem[]): number =>
  orders.reduce((total, order) => total + toNumber(order.total_amount), 0);

/**
 * SB1 — the shop's home screen.
 *
 * Owners and managers get the day's totals from GET /supplier/dashboard (the
 * API's own aggregate, not numbers counted on the phone), what's waiting on
 * them, how each rider is doing, the open orders with Accept / Reject on the
 * new ones, open disputes and what needs restocking. A rider only sees their
 * own orders — the summary, products and disputes would just answer 403.
 */
const DashBoardScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const shopId = useActiveShopId();
  const shop = useSelector(selectActiveShop);
  const user = useSelector(selectUser);
  const {isOwner, isShopManager, isRiderOnly} = useSupplierRoles();
  const {count: unread} = useUnreadNotifications();

  const [summary, setSummary] = useState<SupplierDashboard | null>(null);
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [lowStock, setLowStock] = useState<ShopProduct[]>([]);
  /** null when the listings couldn't be read. */
  const [lowStockTotal, setLowStockTotal] = useState<number | null>(null);
  /** null when the disputes couldn't be read. */
  const [openDisputes, setOpenDisputes] = useState<number | null>(null);
  const [moreDisputes, setMoreDisputes] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acceptingId, setAcceptingId] = useState<number | null>(null);
  const [togglingOpen, setTogglingOpen] = useState(false);

  // Only the newest load may write to state — switching shops mid-request must
  // not let the old shop's numbers land on the new one.
  const requestIdRef = useRef(0);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!shopId) {
        // A cold start straight into the tabs can beat GET /supplier/shops.
        try {
          dispatch(setShops(await listShops()));
        } catch {
          /* the 401 interceptor handles a dead token */
        }
        setLoading(false);
        return;
      }

      const requestId = ++requestIdRef.current;
      if (isRefresh) setRefreshing(true);

      // Each card degrades on its own — one failing call must not blank the
      // whole dashboard.
      const [ordersRes, summaryRes, productsRes, disputesRes, shopsRes] =
        await Promise.allSettled([
          listShopOrders(shopId, {
            per_page: 100,
            page: 1,
            sort_by: 'created_at',
            sort_order: 'desc',
          }),
          isShopManager
            ? getSupplierDashboard({shop_id: shopId})
            : Promise.resolve(null),
          isShopManager
            ? listShopProducts(shopId, {low_stock: 'true', per_page: 20})
            : Promise.resolve(null),
          isShopManager
            ? listShopDisputes(shopId, {per_page: 50})
            : Promise.resolve(null),
          // A pull-to-refresh re-reads the shop too, so an Aqua Flow pause or
          // suspension shows up in the banners without a restart.
          isRefresh ? listShops() : Promise.resolve(null),
        ]);

      if (requestId !== requestIdRef.current) return;

      setOrders(
        ordersRes.status === 'fulfilled' ? ordersRes.value.data ?? [] : [],
      );
      setSummary(summaryRes.status === 'fulfilled' ? summaryRes.value : null);

      if (productsRes.status === 'fulfilled' && productsRes.value) {
        const rows = productsRes.value.data ?? [];
        setLowStock(rows);
        setLowStockTotal(productsRes.value.total ?? rows.length);
      } else {
        setLowStock([]);
        setLowStockTotal(null);
      }

      if (disputesRes.status === 'fulfilled' && disputesRes.value) {
        const page = disputesRes.value;
        setOpenDisputes((page.data ?? []).filter(isDisputeLive).length);
        setMoreDisputes((page.last_page ?? 1) > 1);
      } else {
        setOpenDisputes(null);
        setMoreDisputes(false);
      }

      if (shopsRes.status === 'fulfilled' && shopsRes.value) {
        dispatch(setShops(shopsRes.value));
      }

      setError(
        ordersRes.status === 'rejected'
          ? apiErrorMessage(ordersRes.reason, "Couldn't load your orders.")
          : summaryRes.status === 'rejected'
          ? apiErrorMessage(summaryRes.reason, "Couldn't load today's summary.")
          : null,
      );
      setLoading(false);
      setRefreshing(false);
    },
    [dispatch, isShopManager, shopId],
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onAccept = async (orderId: number) => {
    if (!shopId) return;
    setAcceptingId(orderId);
    try {
      await acceptOrder(shopId, orderId);
      Toast.show({type: 'success', text1: 'Order accepted'});
      await load(true);
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: apiErrorMessage(err, 'Could not accept the order.'),
      });
    } finally {
      setAcceptingId(null);
    }
  };

  /**
   * Pause/resume the shop — a shop update, which only the owner may make.
   * `status` is admin-controlled, so only `is_open` is ours to set.
   */
  const toggleOpen = async () => {
    if (!shop || togglingOpen) return;
    setTogglingOpen(true);
    try {
      const updated = await setShopOpenState(shop.id, !shop.is_open);
      dispatch(upsertShop(updated));
      Toast.show({
        type: 'success',
        text1: updated.is_open
          ? 'Now accepting orders'
          : 'Paused — no new orders',
      });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: apiErrorMessage(err, 'Could not change your store status.'),
      });
    } finally {
      setTogglingOpen(false);
    }
  };

  const openLowStock = () => {
    // Land on the filtered list when there is something to restock.
    if (lowStock.length) dispatch(setCatalogLowStock(true));
    navigation.navigate(Route.CatalogScreen);
  };

  const stats = useMemo(() => {
    const today = orders.filter(order => isToday(order.created_at));
    const todayEarned = today.filter(order =>
      EARNED.includes(order.order_status),
    );
    const open = orders.filter(order =>
      ACTIONABLE.includes(order.order_status),
    );
    // New orders first — they're the ones with a decision attached.
    const needsAction = [
      ...open.filter(order => order.order_status === 'placed'),
      ...open.filter(order => order.order_status !== 'placed'),
    ];
    return {today, todayEarned, needsAction};
  }, [orders]);

  if (loading) return <ScreenLoader message="Loading your shop…" />;

  // The API's totals when we have them; otherwise counted from the order page.
  const totals = summary?.totals ?? null;
  const ordersToday = totals ? toNumber(totals.orders) : stats.today.length;
  const deliveredToday = totals
    ? toNumber(totals.delivered)
    : stats.todayEarned.length;
  const amountToday = totals
    ? toNumber(totals.delivered_amount)
    : sumTotals(stats.todayEarned);
  const breakdown = totals
    ? [
        `${toNumber(totals.new)} new`,
        `${toNumber(totals.in_progress)} in progress`,
        `${toNumber(totals.delivery_failed)} failed`,
        `${toNumber(totals.rejected)} rejected`,
        `${toNumber(totals.cancelled)} cancelled`,
      ].join(' · ')
    : null;

  const shownOrders = stats.needsAction.slice(0, NEEDS_ACTION_LIMIT);
  const suspended = shop?.status === 'suspended';

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={[Colors.heroFrom, Colors.heroTo]}
        start={{x: 0.1, y: 0}}
        end={{x: 0.9, y: 1}}
        style={styles.header}>
        <View style={styles.ripple} pointerEvents="none">
          <RippleArt size={150} />
        </View>

        <View style={styles.headerRow}>
          <View style={styles.headerTitles}>
            <Text style={styles.headerKicker}>
              {isRiderOnly ? 'Rider' : 'Supplier'}
            </Text>
            <Text style={styles.headerName} numberOfLines={1}>
              {shop?.public_name ?? user?.name ?? 'Your shop'}
            </Text>
          </View>

          <BellButton
            count={unread}
            onPress={() => navigation.navigate(Route.NotificationScreen)}
          />

          <ShopStatusPill
            label={shopStatusLabel(shop)}
            open={!!shop?.is_open && shop?.status === 'active'}
            onDark
          />
        </View>

        <View style={styles.headerStats}>
          <HeaderStat value={String(ordersToday)} label="Orders today" />
          <HeaderStat value={String(deliveredToday)} label="Delivered" />
          <HeaderStat
            value={formatMoney(amountToday).replace('Rs ', '')}
            label="Rs today"
          />
        </View>
        {!!breakdown && <Text style={styles.breakdown}>{breakdown}</Text>}
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
          />
        }>
        <StatusBanners />

        {!!error && (
          <RetryBanner
            message={error}
            busy={refreshing}
            onRetry={() => load(true)}
          />
        )}

        {!shopId ? (
          <EmptyState
            title="No shop assigned yet"
            message="Your account isn't linked to a shop. Ops assign one once your application is approved."
          />
        ) : (
          <>
            {isShopManager && (
              <View style={styles.actions}>
                {isOwner && (
                  <AppButton
                    title={shop?.is_open ? 'Pause shop' : 'Resume shop'}
                    variant="secondary"
                    small
                    loading={togglingOpen}
                    disabled={!shop || suspended}
                    onPress={toggleOpen}
                  />
                )}
                <AppButton
                  title="Add product"
                  small
                  onPress={() =>
                    navigation.navigate(Route.ProductFormScreen, {})
                  }
                />
              </View>
            )}

            {!!summary && <AttentionCard summary={summary} />}

            <SectionHeader
              title={isShopManager ? 'Needs action' : 'Your open orders'}
              count={stats.needsAction.length}
              actionLabel="See all"
              onAction={() => navigation.navigate(Route.OrderScreen)}
            />

            {shownOrders.length ? (
              shownOrders.map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  busy={acceptingId === order.id}
                  onPress={() =>
                    navigation.navigate(Route.OrderDetailScreen, {
                      orderId: order.id,
                    })
                  }
                  onAccept={
                    isShopManager ? () => onAccept(order.id) : undefined
                  }
                  onReject={
                    isShopManager
                      ? () =>
                          navigation.navigate(Route.OrderDetailScreen, {
                            orderId: order.id,
                            reject: true,
                          })
                      : undefined
                  }
                />
              ))
            ) : !error ? (
              <Card>
                <Text style={styles.calm}>
                  {isShopManager
                    ? 'Nothing waiting on you — every order is closed. New orders land here the moment a customer places one.'
                    : 'No open deliveries right now. Orders assigned to you land here.'}
                </Text>
              </Card>
            ) : null}

            {stats.needsAction.length > NEEDS_ACTION_LIMIT && (
              <AppButton
                title={`See all ${stats.needsAction.length} open orders`}
                variant="secondary"
                small
                onPress={() => navigation.navigate(Route.OrderScreen)}
              />
            )}

            {isShopManager ? (
              <>
                <OpenDisputesCard
                  count={openDisputes}
                  more={moreDisputes}
                  onPress={() => navigation.navigate(Route.DisputesScreen)}
                />
                <RestockCard
                  items={lowStock}
                  total={lowStockTotal}
                  onManage={openLowStock}
                />
              </>
            ) : (
              <InfoNote>
                You see the orders assigned to you. Open one to call the
                customer, start the delivery or mark it delivered.
              </InfoNote>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.surface},

  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 18,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  ripple: {position: 'absolute', right: -26, top: -22, opacity: 0.16},
  headerRow: {flexDirection: 'row', alignItems: 'center', gap: 12},
  headerTitles: {flex: 1, minWidth: 0},
  headerKicker: {
    fontSize: 11,
    color: Colors.textOnDark2,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  headerName: {fontSize: 17, fontWeight: '800', color: Colors.white},
  headerStats: {flexDirection: 'row', gap: 9, marginTop: 16},
  breakdown: {fontSize: 11.5, color: Colors.textOnDark, marginTop: 10},

  body: {padding: 20, gap: 12, paddingBottom: 30},
  actions: {flexDirection: 'row', gap: 9},
  calm: {fontSize: 13, color: Colors.textSecondary, lineHeight: 20},
});

export default DashBoardScreen;
