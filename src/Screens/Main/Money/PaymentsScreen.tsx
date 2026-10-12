import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import Toast from 'react-native-toast-message';

import {Colors} from '../../../Constant/Colors';
import {Fonts} from '../../../Constant/Fonts';
import Route from '../../../Constant/NavigationStrings';
import AppHeader from '../../../Component/Common/AppHeader';
import Card from '../../../Component/Common/Card';
import EmptyState from '../../../Component/Common/EmptyState';
import InfoNote from '../../../Component/Common/InfoNote';
import LoadMoreFooter from '../../../Component/Common/LoadMoreFooter';
import StatusBadge from '../../../Component/Common/StatusBadge';
import FilterRow from '../../../Component/People/FilterRow';
import RestrictedScreen from '../../../Component/People/RestrictedScreen';
import {useActiveShopId} from '../../../hooks/useActiveShop';
import {useSupplierRoles} from '../../../hooks/useSupplierRoles';
import dayjs, {formatDateTime} from '../../../helper/dateHelper';
import {
  apiErrorMessage,
  formatMoney,
  pluralize,
  statusLabel,
} from '../../../helper/helperFunction';
import {
  PAYMENT_STATUSES,
  listShopPayments,
  type Payment,
  type PaymentStatus,
} from '../../../Server/Payments/PaymentsApi';

const PER_PAGE = 15;

type Range = '7' | '30' | '90' | 'all';

const RANGE_OPTIONS: {value: Range; label: string}[] = [
  {value: '7', label: 'Last 7 days'},
  {value: '30', label: 'Last 30 days'},
  {value: '90', label: 'Last 90 days'},
  {value: 'all', label: 'All time'},
];

const STATUS_OPTIONS: {value: PaymentStatus | 'all'; label: string}[] = [
  {value: 'all', label: 'All'},
  ...PAYMENT_STATUSES.map(status => ({value: status, label: statusLabel(status)})),
];

/**
 * Cash-on-delivery money recorded against the shop's orders — read-only, for
 * reconciling what riders collected. Owners and managers only.
 */
const PaymentsScreen: React.FC = () => {
  const {isShopManager} = useSupplierRoles();
  const shopId = useActiveShopId();

  if (!isShopManager) {
    return (
      <RestrictedScreen
        title="Payments"
        heading="For owners and managers"
        message="Payments are for shop owners and managers. Your deliveries and cash collected show on each order."
      />
    );
  }

  if (!shopId) {
    return (
      <RestrictedScreen
        title="Payments"
        heading="No shop yet"
        message="No shop is linked to this account yet, so there are no payments to show."
      />
    );
  }

  return <PaymentsList shopId={shopId} />;
};

/** Page-numbered list; "Load more" appends the next page. */
const PaymentsList: React.FC<{shopId: number}> = ({shopId}) => {
  const navigation = useNavigation<any>();

  const [status, setStatus] = useState<PaymentStatus | 'all'>('all');
  const [range, setRange] = useState<Range>('all');

  const [rows, setRows] = useState<Payment[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Bumped on every fresh load so a slow response for old filters is dropped.
  const requestId = useRef(0);

  const fetchPage = useCallback(
    (pageNumber: number) =>
      listShopPayments(shopId, {
        status: status === 'all' ? undefined : status,
        date_from:
          range === 'all'
            ? undefined
            : dayjs().subtract(Number(range), 'day').format('YYYY-MM-DD'),
        per_page: PER_PAGE,
        page: pageNumber,
      }),
    [shopId, status, range],
  );

  const load = useCallback(
    async (isRefresh = false) => {
      const id = ++requestId.current;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const res = await fetchPage(1);
        if (id !== requestId.current) return;
        setRows(res.data ?? []);
        setPage(res.current_page || 1);
        setLastPage(res.last_page || 1);
        setTotal(res.total ?? 0);
      } catch (err) {
        if (id !== requestId.current) return;
        const message = apiErrorMessage(err, 'Could not load payments.');
        setError(message);
        Toast.show({type: 'error', text1: message});
      } finally {
        if (id === requestId.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [fetchPage],
  );

  // Not on focus: coming back from an order shouldn't drop the loaded pages.
  useEffect(() => {
    load();
  }, [load]);

  const loadMore = async () => {
    if (page >= lastPage || loadingMore) return;
    const id = requestId.current;
    setLoadingMore(true);
    try {
      const res = await fetchPage(page + 1);
      if (id !== requestId.current) return;
      setRows(prev => {
        const seen = new Set(prev.map(payment => payment.id));
        return [...prev, ...(res.data ?? []).filter(p => !seen.has(p.id))];
      });
      setPage(res.current_page || page + 1);
      setLastPage(res.last_page || 1);
      setTotal(res.total ?? total);
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: apiErrorMessage(err, 'Could not load more payments.'),
      });
    } finally {
      setLoadingMore(false);
    }
  };

  const filtered = status !== 'all' || range !== 'all';

  return (
    <View style={styles.screen}>
      <AppHeader
        title="Payments"
        subtitle={
          loading && !rows.length
            ? 'Cash collected against your orders'
            : `${pluralize(total, 'payment')} · cash collected against your orders`
        }
      />

      <FlatList
        data={rows}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
        }
        ListHeaderComponent={
          <View style={styles.filters}>
            <FilterRow
              label="Status"
              options={STATUS_OPTIONS}
              value={status}
              onChange={setStatus}
            />
            <FilterRow
              label="Date"
              options={RANGE_OPTIONS}
              value={range}
              onChange={setRange}
            />
            {loading && rows.length > 0 && (
              <ActivityIndicator color={Colors.primary} style={styles.inlineLoader} />
            )}
          </View>
        }
        renderItem={({item}) => (
          <PaymentRow
            payment={item}
            onPress={() =>
              navigation.navigate(Route.OrderDetailScreen, {orderId: item.order_id})
            }
          />
        )}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={Colors.primary} style={styles.loader} />
          ) : error ? (
            <EmptyState
              title="Couldn't load payments"
              message={error}
              actionLabel="Try again"
              onAction={() => load()}
            />
          ) : (
            <EmptyState
              title="No payments found"
              message={
                filtered
                  ? 'Nothing matches these filters. Try a wider date range.'
                  : 'Payments appear here as your orders are delivered.'
              }
            />
          )
        }
        ListFooterComponent={
          <View style={styles.footer}>
            <LoadMoreFooter
              shown={rows.length}
              total={total}
              hasMore={page < lastPage}
              loading={loadingMore}
              onLoadMore={loadMore}
              noun="payments"
            />
            <InfoNote>
              A payment turns succeeded when the delivery code is confirmed —
              that handover is the moment cash changes hands. Nothing here can
              be edited; what you collect is settled to you on the weekly cycle
              (see Money).
            </InfoNote>
          </View>
        }
      />
    </View>
  );
};

/** One payment: the order it belongs to, who paid, how, and where it stands. */
const PaymentRow: React.FC<{payment: Payment; onPress: () => void}> = ({
  payment,
  onPress,
}) => {
  const meta = [payment.order?.customer?.name, payment.method?.toUpperCase()]
    .filter(Boolean)
    .join(' · ');

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
      <Card>
        <View style={styles.rowHead}>
          <View style={styles.flex}>
            <Text style={styles.order} numberOfLines={1}>
              {payment.order?.order_number ?? `Order #${payment.order_id}`}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {meta || '—'}
            </Text>
          </View>
          <Text style={styles.amount}>{formatMoney(payment.amount)}</Text>
        </View>

        {!!payment.reference && (
          <Text style={styles.reference} numberOfLines={1}>
            Ref {payment.reference}
          </Text>
        )}

        <View style={styles.rowFoot}>
          <Text style={styles.date}>{formatDateTime(payment.created_at)}</Text>
          <StatusBadge status={payment.status} />
        </View>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.surface},
  flex: {flex: 1},
  body: {padding: 18, gap: 12, paddingBottom: 30},
  filters: {gap: 12, marginBottom: 2},
  inlineLoader: {alignSelf: 'flex-start'},
  loader: {paddingVertical: 40},
  footer: {gap: 12},

  rowHead: {flexDirection: 'row', alignItems: 'flex-start', gap: 12},
  order: {fontSize: 14.5, fontWeight: '800', color: Colors.primary},
  meta: {fontSize: 12.5, color: Colors.textSecondary, marginTop: 2},
  amount: {
    fontFamily: Fonts.mono,
    fontSize: 15,
    fontWeight: '800',
    color: Colors.text,
  },
  reference: {
    fontFamily: Fonts.mono,
    fontSize: 11.5,
    color: Colors.textMuted,
    marginTop: 6,
  },
  rowFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 10,
  },
  date: {fontSize: 12, color: Colors.textMuted},
});

export default PaymentsScreen;
