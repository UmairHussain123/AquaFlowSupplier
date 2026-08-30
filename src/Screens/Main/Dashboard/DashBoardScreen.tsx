import React, {useCallback, useState} from 'react';
import {
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import {useDispatch, useSelector} from 'react-redux';
import Toast from 'react-native-toast-message';

import {Colors} from '../../../Constant/Colors';
import Route from '../../../Constant/NavigationStrings';
import Card from '../../../Component/Common/Card';
import EmptyState from '../../../Component/Common/EmptyState';
import SectionHeader from '../../../Component/Common/SectionHeader';
import ShopStatusPill from '../../../Component/Common/ShopStatusPill';
import OrderCard from '../../../Component/Cards/OrderCard';
import {HeaderStat, StatTile} from '../../../Component/Cards/StatTile';
import ScreenLoader from '../../../Component/Common/ScreenLoader';
import {BellIcon, ChevronRight} from '../../../Component/Icons/TabIcons';
import {RippleArt} from '../../../Component/Icons/Illustrations';
import {useActiveShopId} from '../../../hooks/useActiveShop';
import {
  selectActiveShop,
  setShops,
  shopStatusLabel,
} from '../../../Redux/slices/shopSlice';
import {selectUser} from '../../../Redux/slices/userSlice';
import {listShops} from '../../../Server/Shops/ShopsApi';
import {
  getDashboardSummary,
  type DashboardSummary,
} from '../../../Server/Dashboard/DashBoardApi';
import {acceptOrder} from '../../../Server/Order/OrdersApi';
import {
  getComplianceSummary,
  type ComplianceSummary,
} from '../../../Server/Compliance/ComplianceApi';
import {apiErrorMessage, formatMoney} from '../../../helper/helperFunction';

/**
 * SB1 — the shop's home screen: the dark header with today's numbers, the
 * compliance nudge, the orders waiting on a decision, stock and this week's
 * money.
 */
const DashBoardScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const shopId = useActiveShopId();
  const shop = useSelector(selectActiveShop);
  const user = useSelector(selectUser);

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [compliance, setCompliance] = useState<ComplianceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acceptingId, setAcceptingId] = useState<number | null>(null);

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

      if (isRefresh) setRefreshing(true);

      try {
        const [dashboard, complianceSummary] = await Promise.all([
          getDashboardSummary(shopId),
          getComplianceSummary(),
        ]);
        setSummary(dashboard);
        setCompliance(complianceSummary);
      } catch (error) {
        Toast.show({
          type: 'error',
          text1: apiErrorMessage(error, 'Could not load your dashboard.'),
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [dispatch, shopId],
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
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: apiErrorMessage(error, 'Could not accept the order.'),
      });
    } finally {
      setAcceptingId(null);
    }
  };

  if (loading) return <ScreenLoader message="Loading your shop…" />;

  const lowStockItem = summary?.lowStock?.[0];

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
            <Text style={styles.headerKicker}>Supplier</Text>
            <Text style={styles.headerName} numberOfLines={1}>
              {shop?.public_name ?? user?.name ?? 'Your shop'}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate(Route.NotificationScreen)}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
            style={styles.bell}>
            <BellIcon color={Colors.white} size={20} />
          </TouchableOpacity>

          <ShopStatusPill
            label={shopStatusLabel(shop)}
            open={!!shop?.is_open && shop?.status === 'active'}
            onDark
          />
        </View>

        <View style={styles.headerStats}>
          <HeaderStat value={String(summary?.ordersToday ?? 0)} label="Orders today" />
          <HeaderStat value={String(summary?.deliveredToday ?? 0)} label="Delivered" />
          <HeaderStat
            value={formatMoney(summary?.revenueToday ?? 0).replace('Rs ', '')}
            label="Rs today"
          />
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
        }>
        {!!compliance?.banner && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => navigation.navigate(Route.ComplianceScreen)}
            style={styles.alert}>
            <View style={styles.alertBar} />
            <View style={styles.flex}>
              <Text style={styles.alertTitle}>{compliance.banner.message}</Text>
              <Text style={styles.alertBody}>{compliance.banner.helper}</Text>
            </View>
            <Text style={styles.alertAction}>Upload</Text>
          </TouchableOpacity>
        )}

        <SectionHeader
          title="New orders"
          count={summary?.newOrders.length ?? 0}
          actionLabel="See all"
          onAction={() => navigation.navigate(Route.OrderScreen)}
        />

        {summary?.newOrders.length ? (
          summary.newOrders
            .slice(0, 3)
            .map(order => (
              <OrderCard
                key={order.id}
                order={order}
                busy={acceptingId === order.id}
                onPress={() =>
                  navigation.navigate(Route.OrderDetailScreen, {orderId: order.id})
                }
                onAccept={() => onAccept(order.id)}
                onReject={() =>
                  navigation.navigate(Route.OrderDetailScreen, {
                    orderId: order.id,
                    reject: true,
                  })
                }
              />
            ))
        ) : (
          <Card>
            <Text style={styles.calm}>
              Nothing waiting on you right now. New orders land here the moment a
              customer places one.
            </Text>
          </Card>
        )}

        <View style={styles.tiles}>
          <StatTile
            label={
              lowStockItem
                ? `${lowStockItem.product?.name ?? 'Low stock'} stock`
                : 'Low stock items'
            }
            value={
              lowStockItem
                ? `${lowStockItem.stock_quantity} left`
                : String(summary?.lowStock.length ?? 0)
            }
            tone={summary?.lowStock.length ? 'danger' : 'neutral'}
          />
          <StatTile
            label="Empties on loan"
            value={String(summary?.emptiesOnLoan ?? 0)}
          />
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => navigation.navigate(Route.MoneyScreen)}>
          <Card>
            <View style={styles.moneyRow}>
              <View style={styles.flex}>
                <Text style={styles.moneyTitle}>This week's earnings</Text>
                <Text style={styles.moneySub}>Tap for the full breakdown</Text>
              </View>
              <Text style={styles.moneyValue}>
                {formatMoney(summary?.weeklyGross ?? 0)}
              </Text>
              <ChevronRight color={Colors.textMuted} size={16} />
            </View>
          </Card>
        </TouchableOpacity>

        {!shopId && (
          <EmptyState
            title="No shop assigned yet"
            message="Your account isn't linked to a shop. Ops assign one once your application is approved."
          />
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.surface},
  flex: {flex: 1},

  header: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 22,
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
  bell: {padding: 4},
  headerStats: {flexDirection: 'row', gap: 9, marginTop: 16},

  body: {padding: 20, gap: 12, paddingBottom: 30},

  alert: {
    backgroundColor: Colors.warningBg,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  alertBar: {width: 7, height: 34, borderRadius: 4, backgroundColor: Colors.warning},
  alertTitle: {fontSize: 13.5, fontWeight: '800', color: Colors.warningText},
  alertBody: {fontSize: 12, color: Colors.warningText2, marginTop: 2},
  alertAction: {fontSize: 12.5, fontWeight: '800', color: Colors.primary},

  calm: {fontSize: 13, color: Colors.textSecondary, lineHeight: 20},

  tiles: {flexDirection: 'row', gap: 11},

  moneyRow: {flexDirection: 'row', alignItems: 'center', gap: 12},
  moneyTitle: {fontSize: 14, fontWeight: '800', color: Colors.text},
  moneySub: {fontSize: 12, color: Colors.textSecondary, marginTop: 2},
  moneyValue: {fontSize: 17, fontWeight: '800', color: Colors.text},
});

export default DashBoardScreen;
