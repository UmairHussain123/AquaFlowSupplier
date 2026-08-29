import React, {useCallback, useEffect, useState} from 'react';
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import Toast from 'react-native-toast-message';

import {Colors} from '../../../Constant/Colors';
import {Fonts} from '../../../Constant/Fonts';
import Route from '../../../Constant/NavigationStrings';
import AppButton from '../../../Component/Common/AppButton';
import AppHeader from '../../../Component/Common/AppHeader';
import AppInput from '../../../Component/Common/AppInput';
import AppModal from '../../../Component/Common/AppModal';
import Card from '../../../Component/Common/Card';
import KeyValueRow from '../../../Component/Common/KeyValueRow';
import Pill from '../../../Component/Common/Pill';
import ProgressSteps from '../../../Component/Common/ProgressSteps';
import ScreenLoader from '../../../Component/Common/ScreenLoader';
import SelectField from '../../../Component/Common/SelectField';
import StatusBadge from '../../../Component/Common/StatusBadge';
import {useActiveShopId} from '../../../hooks/useActiveShop';
import {formatDateTime, formatTimeOfDay} from '../../../helper/dateHelper';
import {apiErrorMessage, formatMoney, formatPhone, statusLabel, toNumber} from '../../../helper/helperFunction';
import {
  ORDER_ACTION_LABELS,
  REJECTION_REASONS,
  completeOrder,
  dispatchOrder,
  fulfilmentProgress,
  getOrder,
  lineTotal,
  nextOrderAction,
  prepareOrder,
  rejectOrder,
  acceptOrder,
} from '../../../Server/Order/OrdersApi';
import type {OrderDetail} from '../../../Server/Order/OrderType';

/**
 * SB3 — order detail with the accept / reject decision and, once accepted, the
 * rest of the fulfilment chain. The `deliver` step needs the customer's OTP, so
 * it hands off to CompleteDeliveryScreen (SB4) instead of firing here.
 */
const OrderDetailScreen: React.FC<{navigation: any; route: any}> = ({
  navigation,
  route,
}) => {
  const shopId = useActiveShopId();
  const orderId = route?.params?.orderId;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState<string>(REJECTION_REASONS[0]);
  const [otherReason, setOtherReason] = useState('');

  const load = useCallback(async () => {
    if (!shopId || !orderId) return;
    try {
      setOrder(await getOrder(shopId, orderId));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: apiErrorMessage(error, 'Could not load the order.'),
      });
    } finally {
      setLoading(false);
    }
  }, [orderId, shopId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Arriving from the inbox's Reject button opens the sheet straight away.
  useEffect(() => {
    if (route?.params?.reject) setRejectOpen(true);
  }, [route?.params?.reject]);

  const runAction = async () => {
    if (!shopId || !order) return;
    const action = nextOrderAction(order.order_status);
    if (!action) return;

    if (action === 'deliver') {
      navigation.navigate(Route.CompleteDeliveryScreen, {orderId: order.id});
      return;
    }

    setBusy(true);
    try {
      const updated =
        action === 'accept'
          ? await acceptOrder(shopId, order.id)
          : action === 'prepare'
          ? await prepareOrder(shopId, order.id)
          : action === 'dispatch'
          ? await dispatchOrder(shopId, order.id)
          : await completeOrder(shopId, order.id);

      setOrder(updated);
      Toast.show({type: 'success', text1: `Order ${statusLabel(updated.order_status)}`});
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: apiErrorMessage(error, 'Could not update the order.'),
      });
    } finally {
      setBusy(false);
    }
  };

  const submitRejection = async () => {
    if (!shopId || !order) return;
    const text = reason === 'Other' ? otherReason.trim() : reason;
    if (!text) {
      Toast.show({type: 'error', text1: 'A reason is required'});
      return;
    }

    setBusy(true);
    try {
      const updated = await rejectOrder(shopId, order.id, text);
      setOrder(updated);
      setRejectOpen(false);
      Toast.show({type: 'success', text1: 'Order rejected'});
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: apiErrorMessage(error, 'Could not reject the order.'),
      });
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <ScreenLoader />;
  if (!order) return <View style={styles.screen} />;

  const address = order.address_snapshot;
  const action = nextOrderAction(order.order_status);
  const deposit = toNumber(order.deposit_amount);
  const discount = toNumber(order.discount_amount);
  const phone = order.contact_phone ?? order.customer?.phone ?? null;

  const openMaps = () => {
    if (!address?.lat || !address?.lng) {
      Toast.show({type: 'error', text1: 'This order has no map pin'});
      return;
    }
    const url = `https://maps.google.com/?q=${address.lat},${address.lng}`;
    Linking.openURL(url).catch(() =>
      Toast.show({type: 'error', text1: 'Could not open maps'}),
    );
  };

  return (
    <View style={styles.screen}>
      <AppHeader
        title={order.order_number}
        subtitle={`Placed ${formatTimeOfDay(order.created_at)}`}
        mono
        right={<StatusBadge status={order.order_status} />}
      />

      <ScrollView contentContainerStyle={styles.body}>
        {order.order_status !== 'placed' && (
          <Card>
            <ProgressSteps
              total={4}
              current={fulfilmentProgress(order.order_status)}
              completedTone="success"
            />
            <Text style={styles.progressCaption}>
              accepted → filled → on way → delivered
            </Text>
          </Card>
        )}

        {/* ---------- Deliver to ---------- */}
        <Card>
          <Text style={styles.label}>Deliver to</Text>
          <Text style={styles.customer}>
            {order.customer?.name ?? `Customer #${order.customer_id}`}
          </Text>
          <Text style={styles.address}>
            {[address?.line1, address?.area, address?.city]
              .filter(Boolean)
              .join(', ') || 'No address on this order'}
          </Text>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.softAction, styles.softActionPrimary]}
              onPress={() =>
                phone
                  ? Linking.openURL(`tel:${phone}`)
                  : Toast.show({type: 'error', text1: 'No phone on this order'})
              }>
              <Text style={styles.softActionPrimaryText}>
                {phone ? `Call ${formatPhone(phone)}` : 'No phone'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.softAction} onPress={openMaps}>
              <Text style={styles.softActionText}>Open in maps</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() =>
              navigation.navigate(Route.OrderMessagesScreen, {orderId: order.id})
            }>
            <Text style={styles.link}>Message the customer</Text>
          </TouchableOpacity>
        </Card>

        {/* ---------- Items & money ---------- */}
        <Card>
          <Text style={styles.label}>Items</Text>

          {order.items?.map(item => (
            <View key={item.id} style={styles.itemRow}>
              <Text style={styles.itemName}>
                {item.quantity} × {item.product_name_snapshot}
              </Text>
              <Text style={styles.itemValue}>{formatMoney(lineTotal(item))}</Text>
            </View>
          ))}

          {deposit > 0 && (
            <View style={styles.depositBox}>
              <Text style={styles.depositTitle}>Container handling</Text>
              <KeyValueRow
                label="Deposit on this order"
                value={formatMoney(deposit)}
                tone="warn"
              />
              <Text style={styles.depositNote}>
                Deposit is container liability — it passes to Aqua Flow and is not
                commissionable.
              </Text>
            </View>
          )}

          <View style={styles.totals}>
            <KeyValueRow
              label="Subtotal"
              value={formatMoney(order.subtotal_amount)}
            />
            <KeyValueRow
              label="Delivery fee"
              value={formatMoney(order.delivery_fee_amount)}
            />
            {toNumber(order.service_fee_amount) > 0 && (
              <KeyValueRow
                label="Service fee"
                value={formatMoney(order.service_fee_amount)}
              />
            )}
            {discount > 0 && (
              <KeyValueRow
                label="Discount"
                value={`− ${formatMoney(discount)}`}
                tone="credit"
              />
            )}
            {toNumber(order.tax_amount) > 0 && (
              <KeyValueRow label="Tax" value={formatMoney(order.tax_amount)} />
            )}

            <View style={styles.rule} />

            <KeyValueRow
              label={
                order.payment_method?.toLowerCase() === 'cod'
                  ? 'Collect cash'
                  : 'Order total'
              }
              value={formatMoney(order.total_amount)}
              strong
            />

            <View style={styles.paymentChips}>
              <Pill label={order.payment_method?.toUpperCase() ?? 'COD'} />
              <Pill
                label={statusLabel(order.payment_status)}
                tone={order.payment_status === 'paid' ? 'success' : 'warning'}
              />
            </View>
          </View>
        </Card>

        {/* ---------- Timeline ---------- */}
        {!!order.status_history?.length && (
          <Card>
            <Text style={styles.label}>Timeline</Text>
            {order.status_history.map(entry => (
              <View key={entry.id} style={styles.timelineRow}>
                <Text style={styles.timelineStatus}>
                  {statusLabel(entry.to_status)}
                </Text>
                <Text style={styles.timelineTime}>
                  {formatDateTime(entry.created_at)}
                </Text>
                {!!entry.reason && (
                  <Text style={styles.timelineReason}>{entry.reason}</Text>
                )}
              </View>
            ))}
          </Card>
        )}

        {!!order.rejection_reason && (
          <Card>
            <Text style={styles.label}>Rejection reason</Text>
            <Text style={styles.address}>{order.rejection_reason}</Text>
          </Card>
        )}

        <TouchableOpacity
          onPress={() =>
            navigation.navigate(Route.RaiseDisputeScreen, {orderId: order.id})
          }>
          <Card>
            <Text style={styles.link}>Something wrong with the jars? Raise a dispute</Text>
          </Card>
        </TouchableOpacity>
      </ScrollView>

      {!!action && (
        <View style={styles.footer}>
          {order.order_status === 'placed' && (
            <AppButton
              title="Reject"
              variant="danger"
              onPress={() => setRejectOpen(true)}
              disabled={busy}
              block={false}
              style={styles.rejectButton}
            />
          )}
          <AppButton
            title={ORDER_ACTION_LABELS[action]}
            onPress={runAction}
            loading={busy}
          />
        </View>
      )}

      <AppModal
        visible={rejectOpen}
        title="Reject this order"
        subtitle="The customer sees the reason, and ops keep a record of it."
        onClose={() => setRejectOpen(false)}
        footer={
          <>
            <AppButton
              title="Cancel"
              variant="secondary"
              onPress={() => setRejectOpen(false)}
            />
            <AppButton
              title="Reject order"
              variant="danger"
              onPress={submitRejection}
              loading={busy}
            />
          </>
        }>
        <SelectField
          label="Reason"
          value={reason}
          options={REJECTION_REASONS.map(item => ({value: item, label: item}))}
          onChange={value => setReason(String(value))}
        />
        {reason === 'Other' && (
          <AppInput
            label="Tell ops what happened"
            value={otherReason}
            onChangeText={setOtherReason}
            multiline
          />
        )}
      </AppModal>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.surface},
  body: {padding: 20, gap: 12, paddingBottom: 30},

  progressCaption: {
    fontFamily: Fonts.mono,
    fontSize: 11.5,
    color: Colors.textSecondary,
    marginTop: 10,
  },

  label: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: Colors.textMuted,
  },
  customer: {fontSize: 15, fontWeight: '800', color: Colors.text, marginTop: 10},
  address: {
    fontSize: 12.5,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginTop: 6,
  },

  actionsRow: {flexDirection: 'row', gap: 9, marginTop: 12},
  softAction: {
    flex: 1,
    backgroundColor: Colors.surface3,
    borderRadius: 11,
    paddingVertical: 11,
    alignItems: 'center',
  },
  softActionPrimary: {backgroundColor: Colors.primaryTint},
  softActionText: {fontSize: 13, fontWeight: '800', color: Colors.slate},
  softActionPrimaryText: {fontSize: 13, fontWeight: '800', color: Colors.primary},
  link: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.primary,
    marginTop: 12,
  },

  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 12,
    marginTop: 11,
  },
  itemName: {flex: 1, fontSize: 14, fontWeight: '700', color: Colors.text},
  itemValue: {fontFamily: Fonts.mono, fontSize: 13.5, color: Colors.text},

  depositBox: {
    backgroundColor: Colors.warningBg,
    borderRadius: 12,
    padding: 12,
    gap: 6,
    marginTop: 12,
  },
  depositTitle: {fontSize: 13.5, fontWeight: '800', color: Colors.warningText},
  depositNote: {fontSize: 11.5, color: Colors.warningText2, lineHeight: 18},

  totals: {gap: 9, marginTop: 12},
  rule: {height: 1, backgroundColor: Colors.borderSoft, marginVertical: 2},
  paymentChips: {flexDirection: 'row', gap: 7, marginTop: 4},

  timelineRow: {marginTop: 11},
  timelineStatus: {fontSize: 13.5, fontWeight: '800', color: Colors.text},
  timelineTime: {
    fontFamily: Fonts.mono,
    fontSize: 11.5,
    color: Colors.textMuted,
    marginTop: 2,
  },
  timelineReason: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 3,
    lineHeight: 18,
  },

  footer: {
    flexDirection: 'row',
    gap: 11,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 18,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSoft,
  },
  rejectButton: {width: 118},
});

export default OrderDetailScreen;
