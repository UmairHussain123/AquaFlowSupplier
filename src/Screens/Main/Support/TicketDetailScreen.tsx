import React, {useCallback, useRef, useState} from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import Toast from 'react-native-toast-message';

import {Colors} from '../../../Constant/Colors';
import {Fonts} from '../../../Constant/Fonts';
import AppButton from '../../../Component/Common/AppButton';
import AppHeader from '../../../Component/Common/AppHeader';
import AppInput from '../../../Component/Common/AppInput';
import Card from '../../../Component/Common/Card';
import InfoNote from '../../../Component/Common/InfoNote';
import ScreenLoader from '../../../Component/Common/ScreenLoader';
import StatusBadge from '../../../Component/Common/StatusBadge';
import {useSelector} from 'react-redux';
import {selectUser} from '../../../Redux/slices/userSlice';
import {formatShortDateTime} from '../../../helper/dateHelper';
import {apiErrorMessage} from '../../../helper/helperFunction';
import {
  canReply,
  categoryLabel,
  getTicket,
  isSlaBreached,
  sendTicketMessage,
  type SupportTicketDetail,
} from '../../../Server/Ticket/TicketApi';

/** A ticket and its thread. Assigning and closing is admin-side — the supplier
 *  replies and watches `status`, `assignee` and `sla_due_at`. */
const TicketDetailScreen: React.FC<{route: any}> = ({route}) => {
  const ticketId = route?.params?.ticketId;
  const user = useSelector(selectUser);
  const listRef = useRef<FlatList<any>>(null);

  const [ticket, setTicket] = useState<SupportTicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!ticketId) return;
    try {
      setTicket(await getTicket(ticketId));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: apiErrorMessage(error, 'Could not load the ticket.'),
      });
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const send = async () => {
    const text = draft.trim();
    if (!text || !ticket) return;

    setSending(true);
    try {
      const message = await sendTicketMessage(ticket.id, text);
      setTicket({...ticket, messages: [...(ticket.messages ?? []), message]});
      setDraft('');
      requestAnimationFrame(() => listRef.current?.scrollToEnd({animated: true}));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: apiErrorMessage(error, 'Could not send the reply.'),
      });
    } finally {
      setSending(false);
    }
  };

  if (loading) return <ScreenLoader />;
  if (!ticket) return <View style={styles.screen} />;

  return (
    <View style={styles.screen}>
      <AppHeader
        title={`TCK-${ticket.id}`}
        subtitle={categoryLabel(ticket.category)}
        mono
        right={<StatusBadge status={ticket.status} />}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
        style={styles.flex}>
        <FlatList
          ref={listRef}
          data={ticket.messages ?? []}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.body}
          ListHeaderComponent={
            <View style={styles.header}>
              <Card>
                <Text style={styles.subject}>{ticket.subject}</Text>
                {!!ticket.order_id && (
                  <Text style={styles.meta}>About order #{ticket.order_id}</Text>
                )}
                <Text style={styles.meta}>
                  Raised {formatShortDateTime(ticket.created_at)}
                  {ticket.assignee ? ` · assigned to ${ticket.assignee.name}` : ''}
                </Text>
                {!!ticket.sla_due_at && (
                  <Text
                    style={[
                      styles.meta,
                      isSlaBreached(ticket) && styles.slaBreached,
                    ]}>
                    Ops response due {formatShortDateTime(ticket.sla_due_at)}
                    {isSlaBreached(ticket) ? ' · overdue' : ''}
                  </Text>
                )}
              </Card>
            </View>
          }
          renderItem={({item}) => {
            const mine = item.sender_id === Number(user?.id);
            return (
              <View style={[styles.bubble, mine && styles.bubbleMine]}>
                <Text style={[styles.sender, mine && styles.senderMine]}>
                  {item.sender?.name ?? (mine ? 'You' : 'Aqua Flow ops')}
                </Text>
                <Text style={[styles.message, mine && styles.messageMine]}>
                  {item.message}
                </Text>
                <Text style={[styles.time, mine && styles.timeMine]}>
                  {formatShortDateTime(item.created_at)}
                </Text>
              </View>
            );
          }}
          ListEmptyComponent={
            <InfoNote>
              No replies yet. Ops pick tickets up in the order they arrive, within
              the SLA above.
            </InfoNote>
          }
        />

        {canReply(ticket) ? (
          <View style={styles.composer}>
            <AppInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Reply to ops…"
              style={styles.flex}
            />
            <AppButton
              title="Send"
              onPress={send}
              loading={sending}
              disabled={!draft.trim()}
              block={false}
              small
            />
          </View>
        ) : (
          <View style={styles.closedBar}>
            <Text style={styles.closedText}>
              This ticket is {ticket.status}. Raise a new one if the problem comes
              back.
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.surface},
  flex: {flex: 1},
  body: {padding: 20, gap: 10, paddingBottom: 20},
  header: {marginBottom: 4},

  subject: {fontSize: 15, fontWeight: '800', color: Colors.text},
  meta: {fontSize: 12, color: Colors.textSecondary, marginTop: 5},
  slaBreached: {color: Colors.danger, fontWeight: '700'},

  bubble: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 13,
    gap: 4,
    alignSelf: 'flex-start',
    maxWidth: '92%',
  },
  bubbleMine: {backgroundColor: Colors.primary, alignSelf: 'flex-end'},
  sender: {
    fontSize: 11.5,
    fontWeight: '800',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  senderMine: {color: Colors.white, opacity: 0.75},
  message: {fontSize: 13.5, color: Colors.text, lineHeight: 20},
  messageMine: {color: Colors.white},
  time: {fontFamily: Fonts.mono, fontSize: 11, color: Colors.textMuted},
  timeMine: {color: Colors.white, opacity: 0.7},

  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    padding: 14,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSoft,
  },
  closedBar: {
    padding: 16,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSoft,
  },
  closedText: {
    fontSize: 12.5,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
  },
});

export default TicketDetailScreen;
