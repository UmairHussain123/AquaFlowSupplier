import React, {useCallback, useState} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
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
import InfoNote from '../../../Component/Common/InfoNote';
import SelectField from '../../../Component/Common/SelectField';
import {disputeSchema} from '../../../Formik/SupportSchema';
import {useActiveShopId} from '../../../hooks/useActiveShop';
import {formatTimeOfDay} from '../../../helper/dateHelper';
import {apiErrorMessage, formatMoney} from '../../../helper/helperFunction';
import {raiseDispute} from '../../../Server/Disputes/DisputesApi';
import {listShopOrders} from '../../../Server/Order/OrdersApi';
import type {OrderListItem} from '../../../Server/Order/OrderType';

/** Raise a claim against one of your own orders. The order is picked from the
 *  orders endpoint rather than asking for a raw id. */
const RaiseDisputeScreen: React.FC<{navigation: any; route: any}> = ({
  navigation,
  route,
}) => {
  const shopId = useActiveShopId();
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    if (!shopId) return;
    try {
      const page = await listShopOrders(shopId, {
        per_page: 50,
        sort_by: 'created_at',
        sort_order: 'desc',
      });
      setOrders(page.data ?? []);
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: apiErrorMessage(err, 'Could not load your orders.'),
      });
    }
  }, [shopId]);

  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, [loadOrders]),
  );

  const formik = useFormik({
    initialValues: {
      order_id: route?.params?.orderId ?? null,
      claim: '',
    },
    validationSchema: disputeSchema,
    onSubmit: async values => {
      if (!shopId) return;
      setError(null);
      try {
        const dispute = await raiseDispute(shopId, {
          order_id: Number(values.order_id),
          claim: values.claim.trim(),
        });
        Toast.show({type: 'success', text1: `Dispute ${dispute.reference} raised`});
        navigation.replace(Route.DisputeDetailScreen, {disputeId: dispute.id});
      } catch (err) {
        setError(apiErrorMessage(err, 'Could not raise the dispute.'));
      }
    },
  });

  const fieldError = (name: string) =>
    (formik.touched as any)[name] && (formik.errors as any)[name];

  return (
    <View style={styles.screen}>
      <AppHeader title="Raise a dispute" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled">
          <SelectField
            label="Which order"
            placeholder="Pick the order"
            value={formik.values.order_id}
            options={orders.map(order => ({
              value: order.id,
              label: order.order_number,
              hint: `${order.customer?.name ?? 'Customer'} · ${formatTimeOfDay(
                order.created_at,
              )} · ${formatMoney(order.total_amount)}`,
            }))}
            onChange={value => formik.setFieldValue('order_id', value)}
            error={fieldError('order_id')}
          />

          <AppInput
            label="What happened"
            value={formik.values.claim}
            onChangeText={formik.handleChange('claim')}
            onBlur={formik.handleBlur('claim')}
            placeholder="e.g. Customer says 2 jars returned, my rider collected 1."
            multiline
            error={fieldError('claim')}
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
