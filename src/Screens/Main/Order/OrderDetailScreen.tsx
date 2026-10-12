import React, {useCallback, useEffect, useState} from 'react';
import {
  Linking,
  RefreshControl,
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
import Card from '../../../Component/Common/Card';
import EmptyState from '../../../Component/Common/EmptyState';
import InfoNote from '../../../Component/Common/InfoNote';
import KeyValueRow from '../../../Component/Common/KeyValueRow';
import Pill from '../../../Component/Common/Pill';
import ProgressSteps from '../../../Component/Common/ProgressSteps';
import ScreenLoader from '../../../Component/Common/ScreenLoader';
import StatusBadge from '../../../Component/Common/StatusBadge';
import {JarGlyph} from '../../../Component/Icons/Illustrations';
import ReasonSheet from '../../../Component/Order/ReasonSheet';
import RiderCard from '../../../Component/Order/RiderCard';
import {
  CLOSED_NEGATIVE,
  RIDER_ASSIGNABLE,
  paymentStatusTone,
} from '../../../Component/Order/orderTones';
import {useActiveShopId} from '../../../hooks/useActiveShop';
import {useSupplierRoles} from '../../../hooks/useSupplierRoles';
import {formatDateTime, formatShortDateTime} from '../../../helper/dateHelper';
import {
  apiErrorMessage,
  formatMoney,
  statusLabel,
  toNumber,
} from '../../../helper/helperFunction';
import {formatPhoneDisplay} from '../../../helper/phoneHelper';
import {
  listShopRiders,
  type DashboardRider,
} from '../../../Server/Dashboard/SupplierDashboardApi';
import {
  ORDER_ACTION_LABELS,
  REJECTION_REASONS,
  acceptOrder,
  addressCoords,
  addressLine,
  assignOrderRider,
  canCancelOrder,
  cancelOrder,
  completeOrder,
  dispatchOrder,
  failDelivery,
  fulfilmentProgress,
  getOrder,
  isMaskedPhone,
  isShopPlaced,
  lineTotal,
  nextOrderAction,
  prepareOrder,
  rejectOrder,
} from '../../../Server/Order/OrdersApi';
import type {OrderDetail, OrderStatus} from '../../../Server/Order/OrderType';

/** Steps only an owner or manager may take — the API answers a rider with a 403. */
const MANAGER_ONLY_ACTIONS = ['accept', 'prepare', 'complete'];

/** Where a rider has nothing to do until the shop moves the order on. */
const WAITING_ON_SHOP: OrderStatus[] = ['placed', 'accepted', 'delivered'];

type ReasonKind = 'reject' | 'cancel' | 'fail';

/**
 * SB3 — order detail with the accept / reject decision and, once accepted, the
 * rest of the fulfilment chain. The `deliver` step needs the customer's OTP
 * (unless the shop placed the order), so it hands off to CompleteDeliveryScreen
 * (SB4) instead of firing here.
 *
 * Accept / reject / prepare / complete, assigning a rider and cancelling are
 * the shop's calls; dispatch, deliver and "delivery failed" are open to riders
 * too — the same split the portal makes.
 */
const OrderDetailScreen: React.FC<{navigation: any; route: any}> = ({
  navigation,
  route,
}) => {
  const shopId = useActiveShopId();
  const {isShopManager} = useSupplierRoles();
  const orderId = route?.params?.orderId;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState<ReasonKind | null>(null);

  const [riders, setRiders] = useState<DashboardRider[]>([]);
  const [ridersLoading, setRidersLoading] = useState(false);
  const [ridersError, setRidersError] = useState<string | null>(null);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!shopId || !orderId) {
        setLoadError('This order could not be found.');
        setLoading(false);
        return;
      }
      if (isRefresh) setRefreshing(true);

      try {
        setOrder(await getOrder(shopId, orderId));
        setLoadError(null);
      } catch (error) {
        const message = apiErrorMessage(error, 'Could not load the order.');
        setLoadError(message);
        Toast.show({type: 'error', text1: message});
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [orderId, shopId],
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Arriving from the inbox's Reject button opens the sheet straight away.
  useEffect(() => {
    if (route?.params?.reject) setSheet('reject');
  }, [route?.params?.reject]);

  const status = order?.order_status;
  const canAssign =
    isShopManager && !!status && RIDER_ASSIGNABLE.includes(status);

  // The staff list is owner-only; the dashboard lists the shop's riders for
  // owners and managers alike, which is exactly who may assign one.
  const loadRiders = useCallback(async () => {
    if (!shopId) return;
    setRidersLoading(true);
    try {
      setRiders(await listShopRiders(shopId));
      setRidersError(null);
    } catch (error) {
      setRidersError(apiErrorMessage(error, "Couldn't load your riders."));
    } finally {
      setRidersLoading(false);
    }
  }, [shopId]);

  useEffect(() => {
    if (canAssign) loadRiders();
  }, [canAssign, loadRiders]);

  /**
   * Action endpoints answer with the bare order (no items, history or
   * customer), so re-read the full detail rather than storing that response.
   */
  const reload = async (fallback?: OrderDetail) => {
    if (!shopId || !orderId) return;
    try {
      setOrder(await getOrder(shopId, orderId));
    } catch {
      if (fallback) setOrder(prev => (prev ? {...prev, ...fallback} : prev));
    }
  };

  /** Resolves true only when the action went through. */
  const runAction = async (
    action: (sid: number, current: OrderDetail) => Promise<OrderDetail>,
    success: string,
  ): Promise<boolean> => {
    if (!shopId || !order) return false;
    setBusy(true);
    try {
      const updated = await action(shopId, order);
      await reload(updated);
      Toast.show({type: 'success', text1: success});
      return true;
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: apiErrorMessage(error, 'Could not update the order.'),
      });
      return false;
    } finally {
      setBusy(false);
    }
  };

  /** Shared by the reject / cancel / delivery-failed sheets; throws keep the sheet open. */
  const submitReason = async (kind: ReasonKind, reason: string) => {
    if (!shopId || !order) return;
    const updated =
      kind === 'reject'
        ? await rejectOrder(shopId, order.id, reason)
        : kind === 'cancel'
        ? await cancelOrder(shopId, order.id, reason)
        : await failDelivery(shopId, order.id, reason);

    setSheet(null);
    Toast.show({
      type: 'success',
      text1:
        kind === 'reject'
          ? 'Order rejected'
          : kind === 'cancel'
          ? 'Order cancelled'
          : 'Delivery marked as failed',
    });
    await reload(updated);
  };

  if (loading) return <ScreenLoader />;

  if (!order) {
    return (
      <View style={styles.screen}>
        <AppHeader title="Order" />
        <EmptyState
          title="Couldn't load this order"
          message={loadError ?? 'This order could not be found.'}
          actionLabel="Try again"
          onAction={() => {
            setLoading(true);
            load();
          }}
        />
      </View>
    );
  }

  const currentStatus = order.order_status;
  const action = nextOrderAction(currentStatus);
  const canRunAction =
    !!action && (isShopManager || !MANAGER_ONLY_ACTIONS.includes(action));
  const canDecide = isShopManager && currentStatus === 'placed';
  const canFail = currentStatus === 'out_for_delivery';
  const canCancel = isShopManager && canCancelOrder(order);
  const waitingOnShop =
    !isShopManager && WAITING_ON_SHOP.includes(currentStatus);
  const showFooter = canRunAction || canFail || canCancel || waitingOnShop;

  const shopPlaced = isShopPlaced(order);
  const isClosedNegative = CLOSED_NEGATIVE.includes(currentStatus);
  const closedReason = order.rejection_reason ?? order.cancellation_reason;

  const address = addressLine(order.address_snapshot);
  const coords = addressCoords(order.address_snapshot);
  const deposit = toNumber(order.deposit_amount);
  const discount = toNumber(order.discount_amount);
  const phone = order.contact_phone ?? order.customer?.phone ?? null;
  // The API only reveals the number from accepted to out for delivery.
  const phoneMasked = isMaskedPhone(phone);

  const runNext = () => {
    if (!action) return;
    if (action === 'deliver') {
      navigation.navigate(Route.CompleteDeliveryScreen, {orderId: order.id});
      return;
    }
    runAction(
      (sid, current) =>
        action === 'accept'
          ? acceptOrder(sid, current.id)
          : action === 'prepare'
          ? prepareOrder(sid, current.id)
          : action === 'dispatch'
          ? dispatchOrder(sid, current.id)
          : completeOrder(sid, current.id),
      action === 'accept'
        ? 'Order accepted'
        : action === 'prepare'
        ? 'Order marked as filled'
        : action === 'dispatch'
        ? 'Order sent out for delivery'
        : 'Order closed',
    );
  };

  const callCustomer = () => {
    if (!phone) return;
    Linking.openURL(`tel:${phone.replace(/[^\d+]/g, '')}`).catch(() =>
      Toast.show({type: 'error', text1: 'Could not start the call'}),
    );
  };

  const openMaps = () => {
    if (!coords) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`;
    Linking.openURL(url).catch(() =>
      Toast.show({type: 'error', text1: 'Could not open maps'}),
    );
  };

  return (
    <View style={styles.screen}>
      <AppHeader
        title={order.order_number}
        subtitle={`Placed ${formatShortDateTime(order.created_at)}`}
        mono
        right={<StatusBadge status={currentStatus} />}
      />

      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              load(true);
              if (canAssign) loadRiders();
            }}
          />
        }>
        {shopPlaced && (
          <View style={styles.metaRow}>
            <Pill label="Placed by shop" tone="primary" uppercase />
            <Text style={styles.metaText}>No delivery OTP on this order.</Text>
          </View>
        )}

        {isClosedNegative ? (
          <View style={styles.closedBanner}>
            <Text style={styles.closedTitle}>
              {currentStatus === 'delivery_failed'
                ? 'Delivery failed'
                : currentStatus === 'rejected'
                ? 'Rejected'
                : 'Cancelled'}
            </Text>
            {!!closedReason && (
              <Text style={styles.closedReason}>{closedReason}</Text>
            )}
          </View>
        ) : (
          currentStatus !== 'placed' && (
            <Card>
              <ProgressSteps
                total={4}
                current={fulfilmentProgress(currentStatus)}
                completedTone="success"
              />
              <Text style={styles.progressCaption}>
                accepted → filled → on way → delivered
              </Text>
            </Card>
          )
        )}

        {/* ---------- Deliver to ---------- */}
        <Card>
          <Text style={styles.label}>Deliver to</Text>
          <Text style={styles.customer}>
            {order.customer?.name ?? `Customer #${order.customer_id}`}
          </Text>
          <Text style={styles.address}>
            {address ?? 'No address on this order'}
          </Text>

          <View style={styles.actionsRow}>
            {phoneMasked ? (
              // A masked number can't be dialled — say when it shows up.
              <View style={[styles.softAction, styles.softActionDashed]}>
                <Text style={styles.softActionText}>{phone}</Text>
                <Text style={styles.softActionHint}>
                  {currentStatus === 'placed'
                    ? 'Visible once accepted'
                    : 'Hidden after delivery'}
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                disabled={!phone}
                style={[styles.softAction, !!phone && styles.softActionPrimary]}
                onPress={callCustomer}>
                <Text
                  style={
                    phone ? styles.softActionPrimaryText : styles.softActionText
                  }>
                  {phone ? `Call ${formatPhoneDisplay(phone)}` : 'No phone'}
                </Text>
              </TouchableOpacity>
            )}

            {!!coords && (
              <TouchableOpacity style={styles.softAction} onPress={openMaps}>
                <Text style={styles.softActionText}>Open in maps</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            onPress={() =>
              navigation.navigate(Route.OrderMessagesScreen, {orderId: order.id})
            }>
            <Text style={styles.link}>Message the customer</Text>
          </TouchableOpacity>
        </Card>

        {/* ---------- Rider ---------- */}
        <RiderCard
          delivery={order.delivery}
          canAssign={canAssign}
          riders={riders}
          ridersLoading={ridersLoading}
          ridersError={ridersError}
          busy={busy}
          onAssign={riderId =>
            runAction(
              (sid, current) => assignOrderRider(sid, current.id, riderId),
              'Rider assigned',
            )
          }
        />

        {/* ---------- Items & money ---------- */}
        <Card>
          <Text style={styles.label}>Items</Text>

          {!order.items?.length && (
            <Text style={styles.address}>No items on this order.</Text>
          )}
          {order.items?.map(item => (
            <View key={item.id} style={styles.itemRow}>
              <View style={styles.itemThumb}>
                <JarGlyph size={22} />
              </View>
              <View style={styles.itemText}>
                <Text style={styles.itemName}>
                  {item.quantity} × {item.product_name_snapshot}
                </Text>
                <Text style={styles.itemMeta}>
                  {formatMoney(item.unit_price)} each
                  {toNumber(item.deposit_amount) > 0
                    ? ` · deposit ${formatMoney(item.deposit_amount)}`
                    : ''}
                </Text>
              </View>
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
                label={`Payment · ${statusLabel(order.payment_status)}`}
                tone={paymentStatusTone(order.payment_status)}
              />
            </View>
          </View>
        </Card>

        {/* ---------- Timeline ---------- */}
        {!!order.status_history?.length && (
          <Card>
            <Text style={styles.label}>Status history</Text>
            {order.status_history.map(entry => (
              <View key={entry.id} style={styles.timelineRow}>
                <Text style={styles.timelineStatus}>
                  {!!entry.from_status && (
                    <Text style={styles.timelineFrom}>
                      {statusLabel(entry.from_status)} →{' '}
                    </Text>
                  )}
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

        <TouchableOpacity
          onPress={() =>
            navigation.navigate(Route.RaiseDisputeScreen, {orderId: order.id})
          }>
          <Card>
            <Text style={styles.link}>Something wrong with the jars? Raise a dispute</Text>
          </Card>
        </TouchableOpacity>
      </ScrollView>

      {showFooter && (
        <View style={styles.footer}>
          {waitingOnShop && (
            <InfoNote tone="neutral">
              Waiting on the shop — nothing for you to do on this order yet.
            </InfoNote>
          )}

          {canRunAction && !!action && (
            <View style={styles.footerRow}>
              {canDecide && (
                <AppButton
                  title="Reject"
                  variant="danger"
                  onPress={() => setSheet('reject')}
                  disabled={busy}
                  block={false}
                  style={styles.rejectButton}
                />
              )}
              <AppButton
                title={ORDER_ACTION_LABELS[action]}
                onPress={runNext}
                loading={busy}
              />
            </View>
          )}

          {canFail && (
            <TouchableOpacity
              disabled={busy}
              onPress={() => setSheet('fail')}
              style={styles.dangerLink}>
              <Text style={styles.dangerLinkText}>Delivery failed</Text>
            </TouchableOpacity>
          )}

          {canCancel && (
            <TouchableOpacity
              disabled={busy}
              onPress={() => setSheet('cancel')}
              style={styles.dangerLink}>
              <Text style={styles.dangerLinkText}>Cancel order</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <ReasonSheet
        visible={sheet === 'reject' && canDecide}
        title="Reject this order"
        description="The customer sees the reason, and ops keep a record of it."
        label="Reason"
        presets={REJECTION_REASONS}
        submitLabel="Reject order"
        danger
        onClose={() => setSheet(null)}
        onSubmit={reason => submitReason('reject', reason)}
      />

      <ReasonSheet
        visible={sheet === 'cancel' && canCancel}
        title="Cancel order"
        description="Stock goes back on the shelf and the payment is voided. Only orders you placed for a customer can be cancelled, and only before they leave for delivery."
        label="Reason"
        placeholder="e.g. Customer called to change the order."
        submitLabel="Cancel order"
        dismissLabel="Keep order"
        danger
        onClose={() => setSheet(null)}
        onSubmit={reason => submitReason('cancel', reason)}
      />

      <ReasonSheet
        visible={sheet === 'fail' && canFail}
        title="Delivery failed"
        description="Use this when the handover couldn't happen — customer unreachable, refused, wrong address. The order is closed and the customer is told why."
        label="What happened?"
        placeholder="e.g. Customer not at the address and not answering calls."
        submitLabel="Mark failed"
        danger
        onClose={() => setSheet(null)}
        onSubmit={reason => submitReason('fail', reason)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.surface},
  body: {padding: 20, gap: 12, paddingBottom: 30},

  metaRow: {flexDirection: 'row', alignItems: 'center', gap: 9},
  metaText: {flex: 1, fontSize: 12, color: Colors.textSecondary},

  closedBanner: {
    backgroundColor: Colors.dangerBg,
    borderWidth: 1,
    borderColor: Colors.dangerBorder,
    borderRadius: 18,
    padding: 14,
    gap: 4,
  },
  closedTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: Colors.danger,
  },
  closedReason: {fontSize: 13, color: Colors.danger, lineHeight: 19},

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
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  softActionPrimary: {backgroundColor: Colors.primaryTint},
  softActionDashed: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.borderDashed,
    paddingVertical: 9,
  },
  softActionText: {fontSize: 13, fontWeight: '800', color: Colors.slate},
  softActionHint: {fontSize: 11, color: Colors.textMuted, marginTop: 2},
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
    alignItems: 'center',
    gap: 12,
    marginTop: 11,
  },
  itemThumb: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: Colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {flex: 1},
  itemName: {fontSize: 14, fontWeight: '700', color: Colors.text},
  itemMeta: {fontSize: 11.5, color: Colors.textMuted, marginTop: 2},
  itemValue: {fontFamily: Fonts.mono, fontSize: 13.5, color: Colors.text},

  depositBox: {
    backgroundColor: Colors.warningBg,
    borderRadius: 16,
    padding: 13,
    gap: 6,
    marginTop: 12,
  },
  depositTitle: {fontSize: 13.5, fontWeight: '800', color: Colors.warningText},
  depositNote: {fontSize: 11.5, color: Colors.warningText2, lineHeight: 18},

  totals: {gap: 9, marginTop: 12},
  rule: {height: 1, backgroundColor: Colors.borderSoft, marginVertical: 2},
  paymentChips: {flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 4},

  timelineRow: {marginTop: 11},
  timelineStatus: {fontSize: 13.5, fontWeight: '800', color: Colors.text},
  timelineFrom: {fontWeight: '600', color: Colors.textMuted},
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
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 20,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSoft,
    shadowColor: 'rgba(11,27,43,1)',
    shadowOpacity: 0.07,
    shadowRadius: 26,
    shadowOffset: {width: 0, height: -8},
    elevation: 12,
  },
  footerRow: {flexDirection: 'row', gap: 11},
  rejectButton: {width: 118},
  dangerLink: {alignItems: 'center', paddingVertical: 6},
  dangerLinkText: {fontSize: 13.5, fontWeight: '800', color: Colors.danger},
});

export default OrderDetailScreen;
