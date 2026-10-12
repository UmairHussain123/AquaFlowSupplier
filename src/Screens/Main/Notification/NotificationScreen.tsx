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
import ChipGroup, {type ChipOption} from '../../../Component/Common/ChipGroup';
import EmptyState from '../../../Component/Common/EmptyState';
import InfoNote from '../../../Component/Common/InfoNote';
import LoadMoreFooter from '../../../Component/Common/LoadMoreFooter';
import Pill from '../../../Component/Common/Pill';
import {ChevronRight} from '../../../Component/Icons/TabIcons';
import {formatShortDateTime, fromNow} from '../../../helper/dateHelper';
import {apiErrorMessage, pluralize} from '../../../helper/helperFunction';
import {
  NOTIFICATION_CHANNELS,
  channelLabel,
  describeNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  notificationOrderId,
  type AppNotification,
  type NotificationChannel,
} from '../../../Server/Notifications/NotificationsApi';

const PER_PAGE = 20;

type ReadFilter = 'all' | 'unread';

const READ_OPTIONS: ChipOption<ReadFilter>[] = [
  {value: 'all', label: 'All'},
  {value: 'unread', label: 'Unread'},
];

type LoadMode = 'initial' | 'refresh' | 'more';

/**
 * The signed-in user's notification feed — GET /supplier/notifications.
 *
 * It's the delivery log, so one event can show up twice (a push and an SMS).
 * Opening a row marks it read and, when it is about an order, opens that
 * order. The dashboard bell re-reads the unread count when it regains focus.
 */
const NotificationScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  const [readFilter, setReadFilter] = useState<ReadFilter>('all');
  const [channel, setChannel] = useState<NotificationChannel | null>(null);

  const [rows, setRows] = useState<AppNotification[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  // Only the newest request may write to state — a slow page for the old
  // filter must not land on top of the new one.
  const requestIdRef = useRef(0);

  const fetchPage = useCallback(
    async (pageToLoad: number, mode: LoadMode) => {
      const requestId = ++requestIdRef.current;
      if (mode === 'initial') {
        setLoading(true);
        setRows([]);
      }
      if (mode === 'refresh') setRefreshing(true);
      if (mode === 'more') setLoadingMore(true);
      if (mode !== 'more') setError(null);

      try {
        const res = await listNotifications({
          unread: readFilter === 'unread',
          channel: channel ?? undefined,
          per_page: PER_PAGE,
          page: pageToLoad,
        });
        if (requestId !== requestIdRef.current) return;

        const data = res.data ?? [];
        setRows(prev =>
          pageToLoad === 1
            ? data
            : [...prev, ...data.filter(n => !prev.some(p => p.id === n.id))],
        );
        setPage(res.current_page ?? pageToLoad);
        setLastPage(res.last_page || 1);
        setTotal(res.total ?? data.length);
        setUnreadCount(res.unread_count ?? 0);
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        const message = apiErrorMessage(
          err,
          "Couldn't load your notifications. Please try again.",
        );
        if (mode === 'more') {
          Toast.show({type: 'error', text1: message});
        } else {
          setError(message);
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setRefreshing(false);
          setLoadingMore(false);
        }
      }
    },
    [readFilter, channel],
  );

  useEffect(() => {
    fetchPage(1, 'initial');
  }, [fetchPage]);

  const loadMore = () => {
    if (loading || refreshing || loadingMore || page >= lastPage) return;
    fetchPage(page + 1, 'more');
  };

  const open = (notification: AppNotification) => {
    if (!notification.read_at) {
      // Optimistic: the row reads as seen at once; a failure just leaves it
      // unread on the next load.
      const stamp = new Date().toISOString();
      setRows(prev =>
        prev.map(row =>
          row.id === notification.id ? {...row, read_at: stamp} : row,
        ),
      );
      setUnreadCount(count => Math.max(0, count - 1));
      markNotificationRead(notification.id).catch(() => {});
    }

    const orderId = notificationOrderId(notification);
    if (orderId) navigation.navigate(Route.OrderDetailScreen, {orderId});
  };

  const markAll = async () => {
    if (markingAll || unreadCount === 0) return;
    setMarkingAll(true);
    try {
      const marked = await markAllNotificationsRead();
      Toast.show({
        type: 'success',
        text1:
          marked > 0
            ? `${pluralize(marked, 'notification')} marked as read`
            : 'Nothing to mark',
      });
      setUnreadCount(0);
      if (readFilter === 'unread') {
        fetchPage(1, 'initial');
      } else {
        const stamp = new Date().toISOString();
        setRows(prev =>
          prev.map(row => ({...row, read_at: row.read_at ?? stamp})),
        );
      }
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: apiErrorMessage(err, "Couldn't mark them as read."),
      });
    } finally {
      setMarkingAll(false);
    }
  };

  const renderItem = ({item}: {item: AppNotification}) => {
    const unread = !item.read_at;
    const opensOrder = notificationOrderId(item) !== null;
    const when = item.sent_at ?? item.created_at;

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityState={{selected: unread}}
        onPress={() => open(item)}>
        <Card highlighted={unread}>
          <View style={styles.row}>
            <View style={[styles.dot, unread && styles.dotUnread]} />
            <View style={styles.flex}>
              <Text style={[styles.title, unread && styles.titleUnread]}>
                {describeNotification(item)}
              </Text>
              <View style={styles.meta}>
                <Pill label={channelLabel(item.channel)} tone="muted" />
                <Text style={styles.when}>
                  {formatShortDateTime(when)} · {fromNow(when)}
                </Text>
              </View>
            </View>
            {opensOrder && <ChevronRight color={Colors.textMuted} size={16} />}
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  const emptyComponent = loading ? (
    <View style={styles.loader}>
      <ActivityIndicator color={Colors.primary} />
    </View>
  ) : error ? (
    <EmptyState
      title="Couldn't load notifications"
      message={error}
      actionLabel="Try again"
      onAction={() => fetchPage(1, 'initial')}
    />
  ) : (
    <EmptyState
      title={
        readFilter === 'unread'
          ? 'No unread notifications'
          : 'No notifications yet'
      }
      message="Order updates, rider assignments and account notices land here."
    />
  );

  return (
    <View style={styles.screen}>
      <AppHeader
        title="Notifications"
        subtitle={
          unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"
        }
        right={
          <TouchableOpacity
            accessibilityRole="button"
            disabled={markingAll || unreadCount === 0}
            onPress={markAll}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            {markingAll ? (
              <ActivityIndicator color={Colors.primary} size="small" />
            ) : (
              <Text
                style={[
                  styles.markAll,
                  unreadCount === 0 && styles.markAllDisabled,
                ]}>
                Mark all read
              </Text>
            )}
          </TouchableOpacity>
        }
      />

      <View style={styles.filters}>
        <ChipGroup
          options={READ_OPTIONS}
          value={readFilter}
          required
          onChange={next => setReadFilter(next ?? 'all')}
        />
        <ChipGroup
          options={NOTIFICATION_CHANNELS}
          value={channel}
          onChange={setChannel}
        />
      </View>

      <FlatList
        data={rows}
        keyExtractor={item => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchPage(1, 'refresh')}
          />
        }
        ListEmptyComponent={emptyComponent}
        ListFooterComponent={
          <View style={styles.footer}>
            <LoadMoreFooter
              shown={rows.length}
              total={total}
              hasMore={page < lastPage}
              loading={loadingMore}
              onLoadMore={loadMore}
              noun="notifications"
            />
            <InfoNote>
              This is your delivery log, so one event can show up twice — for
              example a push and an SMS. Open a notification to mark it as read.
            </InfoNote>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.surface},
  flex: {flex: 1},
  filters: {paddingHorizontal: 20, paddingTop: 14, gap: 8},
  body: {padding: 20, gap: 10, paddingBottom: 30},
  footer: {gap: 12, marginTop: 4},
  loader: {paddingVertical: 40, alignItems: 'center'},

  markAll: {fontSize: 12.5, fontWeight: '800', color: Colors.primary},
  markAllDisabled: {color: Colors.textFaint},

  row: {flexDirection: 'row', alignItems: 'center', gap: 11},
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.transparent,
  },
  dotUnread: {backgroundColor: Colors.primary},
  title: {fontSize: 13.5, fontWeight: '600', color: Colors.textSecondary},
  titleUnread: {fontWeight: '800', color: Colors.text},
  meta: {flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 7},
  when: {
    flexShrink: 1,
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: Colors.textMuted,
  },
});

export default NotificationScreen;
