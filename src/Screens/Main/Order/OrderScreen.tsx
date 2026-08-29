import React, {useCallback, useMemo, useRef, useState} from 'react';
import {
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
import Toast from 'react-native-toast-message';

import {Colors} from '../../../Constant/Colors';
import Route from '../../../Constant/NavigationStrings';
import AppButton from '../../../Component/Common/AppButton';
import EmptyState from '../../../Component/Common/EmptyState';
import InfoNote from '../../../Component/Common/InfoNote';
import OrderCard from '../../../Component/Cards/OrderCard';
import ScreenLoader from '../../../Component/Common/ScreenLoader';
import {useActiveShopId} from '../../../hooks/useActiveShop';
import {setOrderTab} from '../../../Redux/slices/filterSlice';
import {
  acceptOrder,
  listShopOrders,
  orderTabKey,
} from '../../../Server/Order/OrdersApi';
import {ORDER_TABS, type OrderListItem} from '../../../Server/Order/OrderType';
import {apiErrorMessage} from '../../../helper/helperFunction';

/**
 * SB2 — the order inbox.
 *
 * One request pulls a page of the shop's orders and the tabs partition it
 * locally. Querying per status instead meant up to nine parallel requests per
 * load (one per status in the tab, plus one per tab for the counters), and a
 * single one of them failing took the whole `Promise.all` down — so the list
 * came back empty at random. It also made switching tabs a network round trip.
 */
const PAGE_SIZE = 100;

const OrderScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const shopId = useActiveShopId();
  const activeTab = useSelector((state: any) => state.filter.orderTab);

  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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

      try {
        const page = await listShopOrders(shopId, {
          per_page: PAGE_SIZE,
          sort_by: 'created_at',
          sort_order: 'desc',
        });

        if (requestId !== requestIdRef.current) return;
        setOrders(page.data ?? []);
        setError(null);
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        const message = apiErrorMessage(err, 'Could not load your orders.');
        setError(message);
        Toast.show({type: 'error', text1: message});
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [shopId],
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

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
    return buckets;
  }, [orders]);

  const visible = byTab[activeTab] ?? [];

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
            ? {...order, order_status: updated.order_status}
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
        <Text style={styles.title}>Orders</Text>

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
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
          }
          renderItem={({item}) => (
            <OrderCard
              order={item}
              busy={busyId === item.id}
              onPress={() =>
                navigation.navigate(Route.OrderDetailScreen, {orderId: item.id})
              }
              onAccept={() => onAccept(item.id)}
              onReject={() =>
                navigation.navigate(Route.OrderDetailScreen, {
                  orderId: item.id,
                  reject: true,
                })
              }
            />
          )}
          ListEmptyComponent={
            error ? (
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
                  activeTab === 'new'
                    ? 'New orders appear the moment a customer places one.'
                    : 'No orders in this stage right now.'
                }
              />
            )
          }
          ListFooterComponent={
            activeTab === 'new' && visible.length ? (
              <InfoNote tone="neutral">
                Accept quickly — a customer waiting too long will move to another
                shop, and repeated misses pause your listing.
              </InfoNote>
            ) : undefined
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.surface},
  header: {backgroundColor: Colors.white, paddingTop: 14, paddingHorizontal: 20},
  title: {
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: Colors.text,
    marginBottom: 13,
  },
  tabs: {gap: 18, paddingRight: 20},
  tab: {
    paddingBottom: 11,
    borderBottomWidth: 2.5,
    borderBottomColor: Colors.transparent,
  },
  tabActive: {borderBottomColor: Colors.primary},
  tabText: {fontSize: 13.5, fontWeight: '600', color: Colors.textMuted},
  tabTextActive: {fontWeight: '800', color: Colors.text},

  body: {padding: 20, gap: 12, paddingBottom: 30},
  errorState: {alignItems: 'center'},
  retry: {paddingHorizontal: 22, marginTop: -14},
});

export default OrderScreen;
