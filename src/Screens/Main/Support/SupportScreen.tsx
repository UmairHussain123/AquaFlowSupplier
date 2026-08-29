import React, {useCallback, useMemo, useState} from 'react';
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
import ScreenLoader from '../../../Component/Common/ScreenLoader';
import TicketCard from '../../../Component/Cards/TicketCard';
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
 * Tickets are account-scoped (no shop id in the path). The list endpoint takes
 * only a `status` filter, so the Live / Closed tabs partition the current page
 * locally: open + pending are Live, resolved + closed are Closed.
 */
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
  const tab = useSelector((state: any) => state.filter.ticketTab);

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const page = await listMyTickets({per_page: 50});
      setTickets(page.data ?? []);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: apiErrorMessage(error, 'Could not load your tickets.'),
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const visible = useMemo(
    () =>
      tickets.filter(ticket =>
        tab === 'live' ? isTicketLive(ticket) : !isTicketLive(ticket),
      ),
    [tab, tickets],
  );

  const liveCount = tickets.filter(isTicketLive).length;

  if (loading) return <ScreenLoader />;

  return (
    <View style={styles.screen}>
      <AppHeader
        title="Support"
        right={
          <TouchableOpacity
            onPress={() => navigation.navigate(Route.CreateTicketScreen, {})}
            style={styles.newButton}>
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

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => navigation.navigate(Route.DisputesScreen)}>
              <Card>
                <Text style={styles.link}>Jar disputes — raise and follow a claim</Text>
              </Card>
            </TouchableOpacity>

            <View style={styles.tabs}>
              {(['live', 'closed'] as const).map(key => {
                const active = key === tab;
                return (
                  <TouchableOpacity
                    key={key}
                    onPress={() => dispatch(setTicketTab(key))}
                    style={[styles.tab, active && styles.tabActive]}>
                    <Text style={[styles.tabText, active && styles.tabTextActive]}>
                      {key === 'live' ? `Live${liveCount ? ` · ${liveCount}` : ''}` : 'Closed'}
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
          <EmptyState
            title={tab === 'live' ? 'No open tickets' : 'Nothing closed yet'}
            message={
              tab === 'live'
                ? 'Raise a ticket when something needs the ops team.'
                : 'Resolved and closed tickets land here.'
            }
            actionLabel={tab === 'live' ? 'Raise a ticket' : undefined}
            onAction={() => navigation.navigate(Route.CreateTicketScreen, {})}
          />
        }
        ListFooterComponent={
          <View style={styles.footer}>
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
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  newButtonText: {color: Colors.white, fontSize: 12.5, fontWeight: '800'},

  body: {padding: 20, gap: 12, paddingBottom: 30},
  header: {gap: 12},

  announcement: {backgroundColor: Colors.primaryDark, borderRadius: 16, padding: 15, gap: 9},
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
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  callButtonText: {color: Colors.white, fontSize: 13, fontWeight: '800'},
});

export default SupportScreen;
