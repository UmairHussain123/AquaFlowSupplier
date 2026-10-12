import React, {useCallback, useState} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {useFormik} from 'formik';
import Toast from 'react-native-toast-message';

import {Colors} from '../../../Constant/Colors';
import Route from '../../../Constant/NavigationStrings';
import AppButton from '../../../Component/Common/AppButton';
import AppHeader from '../../../Component/Common/AppHeader';
import AppInput from '../../../Component/Common/AppInput';
import Card from '../../../Component/Common/Card';
import EmptyState from '../../../Component/Common/EmptyState';
import InfoNote from '../../../Component/Common/InfoNote';
import SelectField from '../../../Component/Common/SelectField';
import {disputeSchema} from '../../../Formik/SupportSchema';
import {useActiveShopId} from '../../../hooks/useActiveShop';
import {useSupplierRoles} from '../../../hooks/useSupplierRoles';
import {formatTimeOfDay} from '../../../helper/dateHelper';
import {apiErrorMessage, formatMoney} from '../../../helper/helperFunction';
import {raiseDispute} from '../../../Server/Disputes/DisputesApi';
import {listShopOrders} from '../../../Server/Order/OrdersApi';
import type {OrderListItem} from '../../../Server/Order/OrderType';

/** How many recent orders we offer to pick from, as on the portal. */
const ORDER_CHOICES = 50;

/**
 * Raise a claim against one of your own orders. The order is picked from the
 * recent orders; if that list can't load, the order's ID can be typed instead.
 * A claim about one specific jar movement can also carry its container
 * transaction ID. Owners and managers only.
 */
const RaiseDisputeScreen: React.FC<{navigation: any; route: any}> = ({
  navigation,
  route,
}) => {
  const shopId = useActiveShopId();
  const {isShopManager} = useSupplierRoles();
  const presetOrderId = route?.params?.orderId ?? null;

  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [ordersFailed, setOrdersFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    if (!shopId || !isShopManager) {
      setLoadingOrders(false);
      return;
    }
    setLoadingOrders(true);
    try {
      const page = await listShopOrders(shopId, {
        per_page: ORDER_CHOICES,
        sort_by: 'created_at',
        sort_order: 'desc',
      });
      setOrders(page.data ?? []);
      setOrdersFailed(false);
    } catch {
      // Fall back to typing the order's ID rather than blocking the claim.
      setOrdersFailed(true);
    } finally {
      setLoadingOrders(false);
    }
  }, [isShopManager, shopId]);

  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, [loadOrders]),
  );

  const formik = useFormik({
    initialValues: {
      order_id: presetOrderId as number | string | null,
      container_transaction_id: '',
      claim: '',
    },
    validationSchema: disputeSchema,
    onSubmit: async values => {
      if (!shopId) return;
      setError(null);
      const containerTxn = values.container_transaction_id.trim();
      try {
        const dispute = await raiseDispute(shopId, {
          order_id: Number(values.order_id),
          container_transaction_id: containerTxn ? Number(containerTxn) : null,
          claim: values.claim.trim(),
        });
        Toast.show({
          type: 'success',
          text1: `Dispute ${dispute.reference} raised`,
          text2: 'Aqua Flow ops will review it.',
        });
        navigation.replace(Route.DisputeDetailScreen, {disputeId: dispute.id});
      } catch (err) {
        setError(apiErrorMessage(err, 'Could not raise the dispute.'));
      }
    },
  });

  const fieldError = (name: string) =>
    (formik.touched as any)[name] && (formik.errors as any)[name];

  if (!isShopManager) {
    return (
      <View style={styles.screen}>
        <AppHeader title="Raise a dispute" />
        <View style={styles.body}>
          <Card>
            <EmptyState
              title="For owners and managers"
              message="Jar disputes are raised by the shop owner or manager. Tell them if a jar count or deposit doesn't add up."
            />
          </Card>
        </View>
      </View>
    );
  }

  const orderOptions = orders.map(order => ({
    value: order.id,
    label: order.order_number,
    hint: `${order.customer?.name ?? 'Customer'} · ${formatTimeOfDay(
      order.created_at,
    )} · ${formatMoney(order.total_amount)}`,
  }));

  // Opened from an order that isn't among the recent ones — keep it pickable.
  if (
    presetOrderId != null &&
    !orders.some(order => order.id === Number(presetOrderId))
  ) {
    orderOptions.unshift({
      value: Number(presetOrderId),
      label: route?.params?.orderNumber ?? `Order #${presetOrderId}`,
      hint: 'The order you came from',
    });
  }

  const selectedOrderId =
    formik.values.order_id != null && formik.values.order_id !== ''
      ? Number(formik.values.order_id)
      : null;

  return (
    <View style={styles.screen}>
      <AppHeader title="Raise a dispute" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled">
          <Text style={styles.intro}>
            Use this when the jar count, a damaged container or a deposit doesn't
            match what was delivered. Aqua Flow ops investigate and decide any
            adjustment.
          </Text>

          {ordersFailed ? (
            <View style={styles.group}>
              <AppInput
                label="Order ID"
                value={
                  formik.values.order_id != null ? String(formik.values.order_id) : ''
                }
                onChangeText={text =>
                  formik.setFieldValue('order_id', text.replace(/\D/g, ''))
                }
                onBlur={formik.handleBlur('order_id')}
                placeholder="e.g. 1042"
                keyboardType="number-pad"
                mono
                error={fieldError('order_id')}
              />
              <View style={styles.fallbackRow}>
                <Text style={styles.hint}>
                  Couldn't load your recent orders — enter the order's ID instead.
                </Text>
                <TouchableOpacity
                  onPress={loadOrders}
                  hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                  <Text style={styles.link}>Retry</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.group}>
              <SelectField
                label="Which order"
                placeholder={loadingOrders ? 'Loading your orders…' : 'Pick the order'}
                value={selectedOrderId}
                options={orderOptions}
                disabled={loadingOrders || !orderOptions.length}
                onChange={value => {
                  formik.setFieldTouched('order_id', true, false);
                  formik.setFieldValue('order_id', value);
                }}
                error={fieldError('order_id')}
              />
              {!loadingOrders && !orderOptions.length && (
                <Text style={styles.hint}>
                  This shop has no orders to dispute yet.
                </Text>
              )}
            </View>
          )}

          <AppInput
            label="What happened"
            value={formik.values.claim}
            onChangeText={formik.handleChange('claim')}
            onBlur={formik.handleBlur('claim')}
            placeholder="e.g. Customer says 2 jars returned, my rider collected 1."
            multiline
            error={fieldError('claim')}
          />

          <AppInput
            label="Container transaction ID (optional)"
            value={formik.values.container_transaction_id}
            onChangeText={text =>
              formik.setFieldValue('container_transaction_id', text.replace(/\D/g, ''))
            }
            onBlur={formik.handleBlur('container_transaction_id')}
            placeholder="Only if it's about one specific jar movement"
            keyboardType="number-pad"
            mono
            error={fieldError('container_transaction_id')}
          />

          {!!error && <Text style={styles.error}>{error}</Text>}

          <InfoNote tone="warning">
            The deposit on this order stays held while ops investigate. Their
            decision arrives as a status, notes and any adjustment on that week's
            settlement.
          </InfoNote>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <AppButton
          title="Raise dispute"
          onPress={formik.handleSubmit as any}
          loading={formik.isSubmitting}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.surface},
  flex: {flex: 1},
  body: {padding: 20, gap: 13, paddingBottom: 30},
  intro: {fontSize: 12.5, color: Colors.textSecondary, lineHeight: 19},
  group: {gap: 6},
  fallbackRow: {flexDirection: 'row', alignItems: 'flex-start', gap: 12},
  hint: {flex: 1, fontSize: 12, color: Colors.textSecondary, lineHeight: 17},
  link: {fontSize: 12.5, fontWeight: '800', color: Colors.primary},
  error: {fontSize: 13, color: Colors.danger, fontWeight: '600'},
  footer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 18,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSoft,
  },
});

export default RaiseDisputeScreen;
