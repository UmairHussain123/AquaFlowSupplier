import React, {useCallback, useState} from 'react';
import {FlatList, RefreshControl, StyleSheet, Text, View} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import Toast from 'react-native-toast-message';

import {Colors} from '../../../Constant/Colors';
import {Fonts} from '../../../Constant/Fonts';
import Route from '../../../Constant/NavigationStrings';
import AppHeader from '../../../Component/Common/AppHeader';
import Card from '../../../Component/Common/Card';
import EmptyState from '../../../Component/Common/EmptyState';
import InfoNote from '../../../Component/Common/InfoNote';
import Pill from '../../../Component/Common/Pill';
import ScreenLoader from '../../../Component/Common/ScreenLoader';
import {useActiveShopId} from '../../../hooks/useActiveShop';
import {fromNow} from '../../../helper/dateHelper';
import {apiErrorMessage, formatMoney, statusLabel} from '../../../helper/helperFunction';
import {listShopOrders} from '../../../Server/Order/OrdersApi';
import {listShopProducts, isLowStock} from '../../../Server/Product/ProductsApi';
import {listMyTickets, isTicketLive} from '../../../Server/Ticket/TicketApi';
import {getComplianceSummary} from '../../../Server/Compliance/ComplianceApi';

/**
 * Activity feed.
 *
 * The supplier API has no notifications endpoint, so the feed is assembled from
 * what actually needs the supplier's attention right now: orders waiting on a
 * decision, listings at their low-stock threshold, live tickets and an expiring
 * document.
 */
type FeedItem = {
  id: string;
  title: string;
  body: string;
  tone: 'danger' | 'warning' | 'primary' | 'neutral';
  badge: string;
  when?: string;
  onPress?: () => void;
};

const NotificationScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const shopId = useActiveShopId();

  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);

      try {
        const [placed, products, tickets, compliance] = await Promise.all([
          shopId
            ? listShopOrders(shopId, {status: 'placed', per_page: 20})
            : Promise.resolve({data: []} as any),
          shopId
            ? listShopProducts(shopId, {low_stock: 'true', per_page: 20})
            : Promise.resolve({data: []} as any),
          listMyTickets({per_page: 20}),
          getComplianceSummary(),
        ]);

        const feed: FeedItem[] = [];

        (placed.data ?? []).forEach((order: any) => {
          feed.push({
            id: `order-${order.id}`,
            title: `New order ${order.order_number}`,
            body: `${order.customer?.name ?? 'A customer'} · ${formatMoney(
              order.total_amount,
            )} · ${statusLabel(order.order_status)}`,
            tone: 'danger',
            badge: 'Order',
            when: fromNow(order.created_at),
            onPress: () =>
              navigation.navigate(Route.OrderDetailScreen, {orderId: order.id}),
          });
        });

        (products.data ?? []).filter(isLowStock).forEach((listing: any) => {
          feed.push({
            id: `stock-${listing.id}`,
            title: `${listing.product?.name ?? 'A listing'} is low`,
            body: `${listing.stock_quantity} left, threshold ${listing.low_stock_threshold}. Restock before it hides from customers.`,
            tone: 'warning',
            badge: 'Stock',
            onPress: () =>
              navigation.navigate(Route.AdjustStockScreen, {listing}),
          });
        });

        (tickets.data ?? []).filter(isTicketLive).forEach((ticket: any) => {
          feed.push({
            id: `ticket-${ticket.id}`,
            title: `Ticket TCK-${ticket.id} is open`,
            body: ticket.subject,
            tone: 'primary',
            badge: 'Support',
            when: fromNow(ticket.created_at),
            onPress: () =>
              navigation.navigate(Route.TicketDetailScreen, {ticketId: ticket.id}),
          });
        });

        if (compliance.banner) {
          feed.push({
            id: 'compliance',
            title: compliance.banner.message,
            body: compliance.banner.helper,
            tone: 'warning',
            badge: 'Compliance',
            onPress: () => navigation.navigate(Route.ComplianceScreen),
          });
        }

        setItems(feed);
      } catch (error) {
        Toast.show({
          type: 'error',
          text1: apiErrorMessage(error, 'Could not load your activity.'),
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [navigation, shopId],
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (loading) return <ScreenLoader />;

  return (
    <View style={styles.screen}>
      <AppHeader title="Activity" />

      <FlatList
        data={items}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
        }
        renderItem={({item}) => (
          <Card>
            <View style={styles.head}>
              <Pill label={item.badge} tone={item.tone} uppercase />
              {!!item.when && <Text style={styles.when}>{item.when}</Text>}
            </View>
            <Text style={styles.title} onPress={item.onPress}>
              {item.title}
            </Text>
            <Text style={styles.body2}>{item.body}</Text>
          </Card>
        )}
        ListEmptyComponent={
          <EmptyState
            title="All clear"
            message="Nothing needs your attention right now."
          />
        }
        ListFooterComponent={
          <InfoNote>
            This feed is built from your live orders, stock, tickets and
            documents — pull down to refresh it.
          </InfoNote>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.surface},
  body: {padding: 20, gap: 12, paddingBottom: 30},
  head: {flexDirection: 'row', alignItems: 'center', gap: 10},
  when: {
    marginLeft: 'auto',
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.textMuted,
  },
  title: {fontSize: 14.5, fontWeight: '800', color: Colors.text, marginTop: 9},
  body2: {fontSize: 12.5, color: Colors.textSecondary, lineHeight: 19, marginTop: 4},
});

export default NotificationScreen;
