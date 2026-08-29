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
import {ticketSchema} from '../../../Formik/SupportSchema';
import {useActiveShopId} from '../../../hooks/useActiveShop';
import {formatTimeOfDay} from '../../../helper/dateHelper';
import {apiErrorMessage} from '../../../helper/helperFunction';
import {listShopOrders} from '../../../Server/Order/OrdersApi';
import type {OrderListItem} from '../../../Server/Order/OrderType';
import {
  TICKET_CATEGORIES,
  createTicket,
  sendTicketMessage,
} from '../../../Server/Ticket/TicketApi';

/**
 * Raise a support ticket.
 *
 * `POST /supplier/support-tickets` takes only a category, a subject and an
 * optional order — the description goes in as the thread's first message, which
 * is what the detail screen renders.
 */
const CreateTicketScreen: React.FC<{navigation: any; route: any}> = ({
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
        per_page: 30,
        sort_by: 'created_at',
        sort_order: 'desc',
      });
      setOrders(page.data ?? []);
    } catch {
      // Attaching an order is optional — a failure here shouldn't block the form.
    }
  }, [shopId]);

  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, [loadOrders]),
  );

  const formik = useFormik({
    initialValues: {
      category: route?.params?.category ?? 'general',
      subject: route?.params?.subject ?? '',
      order_id: route?.params?.orderId ?? null,
      description: '',
    },
    validationSchema: ticketSchema,
    onSubmit: async values => {
      setError(null);
      try {
        const ticket = await createTicket({
          category: values.category,
          subject: values.subject.trim(),
          order_id: values.order_id ? Number(values.order_id) : null,
        });

        const description = values.description.trim();
        if (description) {
          try {
            await sendTicketMessage(ticket.id, description);
          } catch {
            // The ticket itself exists — they can add the detail from the thread.
          }
        }

        Toast.show({type: 'success', text1: `Ticket TCK-${ticket.id} raised`});
        navigation.replace(Route.TicketDetailScreen, {ticketId: ticket.id});
      } catch (err) {
        setError(apiErrorMessage(err, 'Could not raise the ticket.'));
      }
    },
  });

  const fieldError = (name: string) =>
    (formik.touched as any)[name] && (formik.errors as any)[name];

  return (
    <View style={styles.screen}>
      <AppHeader title="New ticket" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled">
          <SelectField
            label="Category"
            value={formik.values.category}
            options={TICKET_CATEGORIES}
            onChange={value => formik.setFieldValue('category', value)}
            error={fieldError('category')}
          />

          <AppInput
            label="Subject"
            value={formik.values.subject}
            onChangeText={formik.handleChange('subject')}
            onBlur={formik.handleBlur('subject')}
            placeholder="One line ops can route on"
            error={fieldError('subject')}
          />

          <SelectField
            label="About an order?"
            placeholder="Not about a specific order"
            value={formik.values.order_id}
            options={orders.map(order => ({
              value: order.id,
              label: order.order_number,
              hint: `${order.customer?.name ?? 'Customer'} · ${formatTimeOfDay(
                order.created_at,
              )}`,
            }))}
            onChange={value => formik.setFieldValue('order_id', value)}
          />

          <AppInput
            label="What happened"
            value={formik.values.description}
            onChangeText={formik.handleChange('description')}
            placeholder="Dates, amounts and order numbers help ops decide faster"
            multiline
          />

          {!!error && <Text style={styles.error}>{error}</Text>}

          <InfoNote>
            Ops answer inside the ticket thread. For a jar count or deposit
            disagreement, raise a dispute instead — it holds the deposit while
            they decide.
          </InfoNote>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <AppButton
          title="Raise ticket"
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

export default CreateTicketScreen;
