import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {Colors} from '../../Constant/Colors';
import {Fonts} from '../../Constant/Fonts';
import {formatMoney, statusLabel, toNumber} from '../../helper/helperFunction';
import {formatTimeOfDay} from '../../helper/dateHelper';
import {formatPhoneDisplay} from '../../helper/phoneHelper';
import type {OrderListItem} from '../../Server/Order/OrderType';
import {addressArea} from '../../Server/Order/OrdersApi';
import AppButton from '../Common/AppButton';
import Card from '../Common/Card';
import Pill from '../Common/Pill';
import {orderStatusTone, paymentStatusTone} from '../Order/orderTones';

/**
 * One row in the order inbox (SB2) and on the dashboard (SB1). A placed order
 * gets the blue outline plus the Accept / Reject pair — only when the caller
 * passes `onAccept`, so a rider's inbox leaves it out; everything later in the
 * lifecycle is a plain card that opens the detail screen.
 */
const OrderCard: React.FC<{
  order: OrderListItem;
  onPress: () => void;
  onAccept?: () => void;
  onReject?: () => void;
  busy?: boolean;
}> = ({order, onPress, onAccept, onReject, busy = false}) => {
  const isNew = order.order_status === 'placed';
  const deposit = toNumber(order.deposit_amount);
  const area = addressArea(order.address_snapshot);
  // Masked numbers ("0300****567") come back from formatPhoneDisplay unchanged.
  const phone = formatPhoneDisplay(
    order.contact_phone ?? order.customer?.phone,
    '',
  );

  return (
    <Card highlighted={isNew}>
      <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.body}>
        <View style={styles.topRow}>
          <Text style={styles.reference}>
            {order.order_number} · {formatTimeOfDay(order.created_at)}
          </Text>
          {isNew ? (
            <Pill label="Awaiting you" tone="danger" mono />
          ) : (
            <Pill
              label={statusLabel(order.order_status)}
              tone={orderStatusTone(order.order_status)}
            />
          )}
        </View>

        <View>
          <Text style={styles.customer}>
            {order.customer?.name ?? `Customer #${order.customer_id}`}
          </Text>
          {!!phone && <Text style={styles.phone}>{phone}</Text>}
        </View>

        <View style={styles.chips}>
          <Pill
            label={`${order.payment_method?.toUpperCase() ?? 'COD'} ${formatMoney(
              order.total_amount,
            )}`}
          />
          {!!order.payment_status && (
            <Pill
              label={`Payment · ${statusLabel(order.payment_status)}`}
              tone={paymentStatusTone(order.payment_status)}
            />
          )}
          {deposit > 0 && (
            <Pill label={`Deposit ${formatMoney(deposit)}`} tone="warning" />
          )}
          {!!area && <Pill label={area} />}
        </View>
      </TouchableOpacity>

      {isNew && !!onAccept && (
        <View style={styles.actions}>
          <AppButton
            title="Accept"
            onPress={onAccept}
            loading={busy}
            style={styles.accept}
          />
          <AppButton
            title="Reject"
            variant="secondary"
            onPress={onReject}
            disabled={busy}
            block={false}
            style={styles.reject}
          />
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  body: {gap: 10},
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  reference: {
    fontFamily: Fonts.mono,
    fontSize: 12.5,
    fontWeight: '600',
    color: Colors.text,
  },
  customer: {fontSize: 15, fontWeight: '800', color: Colors.text},
  phone: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 3,
  },
  chips: {flexDirection: 'row', flexWrap: 'wrap', gap: 7},
  actions: {flexDirection: 'row', gap: 10, marginTop: 12},
  accept: {height: 46, borderRadius: 14},
  reject: {width: 104, height: 46, borderRadius: 14},
});

export default OrderCard;
