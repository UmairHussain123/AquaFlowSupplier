import React, {useCallback, useMemo, useRef, useState} from 'react';
import {
  FlatList,
  Linking,
  RefreshControl,
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
import AppHeader from '../../../Component/Common/AppHeader';
import Card from '../../../Component/Common/Card';
import EmptyState from '../../../Component/Common/EmptyState';
import ListRow from '../../../Component/Common/ListRow';
import LoadMoreFooter from '../../../Component/Common/LoadMoreFooter';
import ScreenLoader from '../../../Component/Common/ScreenLoader';
import TicketCard from '../../../Component/Cards/TicketCard';
import {useSupplierRoles} from '../../../hooks/useSupplierRoles';
import {setTicketTab} from '../../../Redux/slices/filterSlice';
import {apiErrorMessage} from '../../../helper/helperFunction';
import {
  isTicketLive,
  listMyTickets,
  type SupportTicket,
} from '../../../Server/Ticket/TicketApi';

/**
 * SC3 — Support & disputes.
 *
 * Tickets are account-scoped (no shop id in the path). The Live / Closed / All
 * tabs partition the pages loaded so far locally, as the portal does: open +
 * pending are Live, resolved + closed are Closed. "Load more" appends the next
 * page. The jar-disputes link is for owners and managers only.
 */
const PER_PAGE = 20;

type Tab = 'live' | 'closed' | 'all';

const TABS: {key: Tab; label: string}[] = [
  {key: 'live', label: 'Live'},
  {key: 'closed', label: 'Closed'},
  {key: 'all', label: 'All'},
];

const matchesTab = (ticket: SupportTicket, tab: Tab) =>
  tab === 'all'
    ? true
    : tab === 'live'
    ? isTicketLive(ticket)
    : !isTicketLive(ticket);

const EMPTY_COPY: Record<Tab, {title: string; message: string}> = {
  live: {
    title: 'No open tickets',
    message: 'Nothing is waiting on ops. Raise a ticket when something needs the ops team.',
  },
  closed: {
    title: 'Nothing closed yet',
    message: 'Resolved and closed tickets land here.',
  },
  all: {
    title: 'No tickets yet',
    message: "You haven't raised any tickets. Raise one when something needs the ops team.",
  },
};

const FAQS = [
  {
    question: 'How do jar deposits work?',
    answer:
      'A refundable-deposit container adds a deposit to the order. It is container liability, passes to Aqua Flow and is returned when the jar comes back — it never carries commission.',
  },
  {
    question: 'Why was my order auto-rejected?',
    answer:
      'An order left undecided past its window is released so the customer can order elsewhere. Repeated misses pause your listing until you reopen the shop.',
  },
  {
    question: 'When do I get paid?',
    answer:
      'Each week settles the Friday after it closes, with a two-day dispute buffer before the transfer goes out.',
  },
];

const SupportScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const {isShopManager} = useSupplierRoles();
  const tab: Tab = useSelector((state: any) => state.filter.ticketTab) ?? 'live';

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  // Bumped on every fresh load so a slow response can't overwrite a newer one.
  const requestId = useRef(0);

  const load = useCallback(async (isRefresh = false) => {
    const id = ++requestId.current;
    if (isRefresh) setRefreshing(true);
    try {
      const res = await listMyTickets({per_page: PER_PAGE, page: 1});
      if (id !== requestId.current) return;
      const rows = res.data ?? [];
      setTickets(rows);
      setPage(res.current_page ?? 1);
      setLastPage(res.last_page ?? 1);
      setTotal(res.total ?? rows.length);
      setError(null);
    } catch (err) {
      if (id !== requestId.current) return;
      const message = apiErrorMessage(err, 'Could not load your tickets.');
      setError(message);
      Toast.show({type: 'error', text1: message});
    } finally {
      if (id === requestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const loadMore = async () => {
    if (loadingMore || page >= lastPage) return;
    const id = requestId.current;
    setLoadingMore(true);
    try {
      const res = await listMyTickets({per_page: PER_PAGE, page: page + 1});
      if (id !== requestId.current) return;
      // A ticket raised meanwhile shifts the pages — skip rows already shown.
      setTickets(prev => [
        ...prev,
        ...(res.data ?? []).filter(row => !prev.some(seen => seen.id === row.id)),
      ]);
      setPage(res.current_page ?? page + 1);
      setLastPage(res.last_page ?? lastPage);
      setTotal(res.total ?? total);
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: apiErrorMessage(err, 'Could not load more tickets.'),
      });
    } finally {
      setLoadingMore(false);
    }
  };

  const visible = useMemo(
    () => tickets.filter(ticket => matchesTab(ticket, tab)),
    [tab, tickets],
  );

  const tabCount = (key: Tab) =>
    tickets.filter(ticket => matchesTab(ticket, key)).length;

  const newTicket = () => navigation.navigate(Route.CreateTicketScreen, {});

  if (loading) return <ScreenLoader />;

  return (
    <View style={styles.screen}>
      <AppHeader
        title="Support"
        right={
          <TouchableOpacity onPress={newTicket} style={styles.newButton}>
            <Text style={styles.newButtonText}>New ticket</Text>
          </TouchableOpacity>
        }
      />

      <FlatList
        data={visible}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.announcement}>
              <Text style={styles.announcementLabel}>Announcement</Text>
              <Text style={styles.announcementTitle}>
                Weekly settlement runs every Friday
              </Text>
              <Text style={styles.announcementBody}>
                A two-day dispute buffer applies before the transfer goes out. No
                action needed from you.
              </Text>
            </View>

            {isShopManager && (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => navigation.navigate(Route.DisputesScreen)}>
                <Card>
                  <Text style={styles.link}>Jar disputes — raise and follow a claim</Text>
                </Card>
              </TouchableOpacity>
            )}

            <View style={styles.tabs}>
              {TABS.map(({key, label}) => {
                const active = key === tab;
                const count = tabCount(key);
                return (
                  <TouchableOpacity
                    key={key}
                    accessibilityRole="button"
                    accessibilityState={{selected: active}}
                    onPress={() => dispatch(setTicketTab(key))}
                    style={[styles.tab, active && styles.tabActive]}>
                    <Text style={[styles.tabText, active && styles.tabTextActive]}>
                      {count ? `${label} · ${count}` : label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        }
        renderItem={({item}) => (
          <TicketCard
            ticket={item}
            onPress={() =>
              navigation.navigate(Route.TicketDetailScreen, {ticketId: item.id})
            }
          />
        )}
        ListEmptyComponent={
          error && !tickets.length ? (
            <EmptyState
              title="Couldn't load your tickets"
              message={error}
              actionLabel="Try again"
              onAction={() => load(true)}
            />
          ) : (
            <EmptyState
              title={EMPTY_COPY[tab].title}
              message={
                page < lastPage
                  ? `${EMPTY_COPY[tab].message} Older tickets may be on the next page.`
                  : EMPTY_COPY[tab].message
              }
              actionLabel={tab === 'closed' ? undefined : 'Raise a ticket'}
              onAction={newTicket}
            />
          )
        }
        ListFooterComponent={
          <View style={styles.footer}>
            <LoadMoreFooter
              shown={tickets.length}
              total={total}
              hasMore={page < lastPage}
              loading={loadingMore}
              onLoadMore={loadMore}
              noun="tickets"
            />

            <Card flush>
              {FAQS.map((faq, index) => (
                <ListRow
                  key={faq.question}
                  title={faq.question}
                  subtitle={openFaq === faq.question ? faq.answer : undefined}
                  last={index === FAQS.length - 1}
                  onPress={() =>
                    setOpenFaq(openFaq === faq.question ? null : faq.question)
                  }
                />
              ))}
            </Card>

            <View style={styles.callCard}>
              <Text style={styles.callText}>
                Urgent order or delivery problem? Call ops 9 AM – 11 PM.
              </Text>
              <TouchableOpacity
                style={styles.callButton}
                onPress={() =>
                  Linking.openURL('tel:+922111000000').catch(() =>
                    Toast.show({type: 'error', text1: 'Could not start the call'}),
                  )
                }>
                <Text style={styles.callButtonText}>Call</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.surface},
  newButton: {
    backgroundColor: Colors.primary,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  newButtonText: {color: Colors.white, fontSize: 12.5, fontWeight: '800'},

  body: {padding: 20, gap: 12, paddingBottom: 30},
  header: {gap: 12},

  announcement: {
    backgroundColor: Colors.heroTo,
    borderRadius: 20,
    padding: 16,
    gap: 9,
  },
  announcementLabel: {
    fontSize: 11.5,
    color: Colors.textOnDark2,
    fontWeight: '800',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  announcementTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: Colors.white,
    lineHeight: 20,
  },
  announcementBody: {fontSize: 12.5, color: Colors.textOnDark, lineHeight: 19},

  link: {fontSize: 14, fontWeight: '800', color: Colors.primary},

  tabs: {flexDirection: 'row', gap: 18, paddingHorizontal: 2},
  tab: {paddingBottom: 8, borderBottomWidth: 2.5, borderBottomColor: Colors.transparent},
  tabActive: {borderBottomColor: Colors.primary},
  tabText: {fontSize: 13.5, fontWeight: '600', color: Colors.textMuted},
  tabTextActive: {fontWeight: '800', color: Colors.text},

  footer: {gap: 12, marginTop: 2},
  callCard: {
    backgroundColor: Colors.primaryTint,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  callText: {flex: 1, fontSize: 13, color: Colors.slate2, lineHeight: 19},
  callButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  callButtonText: {color: Colors.white, fontSize: 13, fontWeight: '800'},
});

export default SupportScreen;
