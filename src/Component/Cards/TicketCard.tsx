import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {Colors} from '../../Constant/Colors';
import {Fonts} from '../../Constant/Fonts';
import {fromNow, formatShortDateTime} from '../../helper/dateHelper';
import {
  categoryLabel,
  isSlaBreached,
  type SupportTicket,
} from '../../Server/Ticket/TicketApi';
import Card from '../Common/Card';
import Pill from '../Common/Pill';
import StatusBadge from '../Common/StatusBadge';

/** One support ticket in SC3. */
const TicketCard: React.FC<{ticket: SupportTicket; onPress: () => void}> = ({
  ticket,
  onPress,
}) => (
  <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
    <Card>
      <View style={styles.head}>
        <Text style={styles.reference}>TCK-{ticket.id}</Text>
        <StatusBadge status={ticket.status} />
        {isSlaBreached(ticket) && <Pill label="SLA breached" tone="danger" uppercase />}
      </View>

      <Text style={styles.subject}>{ticket.subject}</Text>

      <Text style={styles.meta}>
        {categoryLabel(ticket.category)}
        {ticket.order_id ? ` · order #${ticket.order_id}` : ''}
      </Text>

      <Text style={styles.age}>
        opened {fromNow(ticket.created_at)}
        {ticket.sla_due_at ? ` · SLA ${formatShortDateTime(ticket.sla_due_at)}` : ''}
      </Text>
    </Card>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  head: {flexDirection: 'row', alignItems: 'center', gap: 9, flexWrap: 'wrap'},
  reference: {
    fontFamily: Fonts.mono,
    fontSize: 12.5,
    fontWeight: '600',
    color: Colors.text,
  },
  subject: {
    fontSize: 14.5,
    fontWeight: '800',
    color: Colors.text,
    marginTop: 9,
  },
  meta: {
    fontSize: 12.5,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginTop: 4,
  },
  age: {
    fontSize: 11.5,
    color: Colors.textMuted,
    fontFamily: Fonts.mono,
    marginTop: 8,
  },
});

export default TicketCard;
