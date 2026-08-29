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
import Toast from 'react-native-toast-message';

import {Colors} from '../../../Constant/Colors';
import {Fonts} from '../../../Constant/Fonts';
import AppButton from '../../../Component/Common/AppButton';
import AppHeader from '../../../Component/Common/AppHeader';
import Card from '../../../Component/Common/Card';
import InfoNote from '../../../Component/Common/InfoNote';
import OtpInput from '../../../Component/Common/OtpInput';
import ProgressSteps from '../../../Component/Common/ProgressSteps';
import QuantityStepper from '../../../Component/Common/QuantityStepper';
import ScreenLoader from '../../../Component/Common/ScreenLoader';
import {CheckIcon} from '../../../Component/Icons/TabIcons';
import {useActiveShopId} from '../../../hooks/useActiveShop';
import {apiErrorMessage, formatMoney, toNumber} from '../../../helper/helperFunction';
import {
  completeOrder,
  deliverOrder,
  emptiesExpected,
  fulfilmentProgress,
  getOrder,
} from '../../../Server/Order/OrdersApi';
import type {OrderDetail} from '../../../Server/Order/OrderType';

/**
 * SB4 — closing out a delivery.
 *
 * `POST .../deliver` takes only the customer's code; the empties count, the
 * damage count and the cash tick have no field on that call, so they are
 * confirmations the rider makes here and — when they don't match what the order
 * expected — the screen steers them into a dispute rather than silently
 * swallowing the difference.
 */
const CompleteDeliveryScreen: React.FC<{navigation: any; route: any}> = ({
  navigation,
  route,
}) => {
  const shopId = useActiveShopId();
  const orderId = route?.params?.orderId;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState('');
  const [empties, setEmpties] = useState(0);
  const [damaged, setDamaged] = useState(0);
  const [cashCollected, setCashCollected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!shopId || !orderId) return;
    try {
      const detail = await getOrder(shopId, orderId);
      setOrder(detail);
      setEmpties(emptiesExpected(detail.items));
      setCashCollected(detail.payment_status === 'paid');
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: apiErrorMessage(err, 'Could not load the order.'),
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

  if (loading) return <ScreenLoader />;
  if (!order) return <View style={styles.screen} />;

  const expected = emptiesExpected(order.items);
  const isCod = order.payment_method?.toLowerCase() === 'cod';
  const cashDue = toNumber(order.total_amount);
  const shortfall = expected - empties;

  const submit = async () => {
    if (!shopId) return;

    if (code.trim().length < 4) {
      setError("Enter the 4-digit code from the customer's app.");
      return;
    }
    if (isCod && !cashCollected) {
      setError(`Confirm you collected ${formatMoney(cashDue)} before closing.`);
      return;
    }

    setError(null);
    setBusy(true);

    try {
      const delivered = await deliverOrder(shopId, order.id, code.trim());

      // The API leaves a delivered order open for the settlement window; close
      // it straight away so the supplier isn't left with a half-finished row.
      try {
        await completeOrder(shopId, delivered.id);
      } catch {
        // Some shops are configured for ops to close the order — not an error.
      }

      Toast.show({type: 'success', text1: 'Delivery completed'});

      if (shortfall > 0) {
        Toast.show({
          type: 'info',
          text1: `${shortfall} jar${shortfall === 1 ? '' : 's'} short`,
          text2: 'Raise a dispute so the deposit is held while ops decide.',
        });
      }

      navigation.goBack();
    } catch (err) {
      setError(
        apiErrorMessage(err, 'That code was not accepted. Ask for it again.'),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.screen}>
      <AppHeader
        title={order.order_number}
        subtitle="Out for delivery"
        mono
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled">
          <ProgressSteps
            total={4}
            current={fulfilmentProgress(order.order_status)}
            completedTone="success"
          />
          <Text style={styles.caption}>
            accepted → filled → on way → delivered
          </Text>

          <Card highlighted>
            <Text style={styles.cardTitle}>Enter customer's delivery OTP</Text>
            <Text style={styles.cardLead}>
              Ask {order.customer?.name ?? 'the customer'} for the code in their
              app. The order cannot close without it.
            </Text>

            <View style={styles.otp}>
              <OtpInput value={code} onChange={setCode} length={4} />
            </View>

            {!!error && <Text style={styles.error}>{error}</Text>}
          </Card>

          <Card>
            <Text style={styles.cardTitle}>Empty jars collected</Text>

            <View style={styles.steppers}>
              <QuantityStepper
                label={`Expected ${expected}`}
                value={empties}
                onChange={setEmpties}
                tone={shortfall > 0 ? 'warning' : 'neutral'}
              />
              <QuantityStepper
                label="Damaged / rejected"
                value={damaged}
                onChange={setDamaged}
              />
            </View>

            {shortfall > 0 && (
              <InfoNote tone="warning">
                {shortfall} jar{shortfall === 1 ? '' : 's'} short of what this
                order expected. Close the delivery, then raise a dispute so the
                deposit stays held while ops decide.
              </InfoNote>
            )}

            {isCod && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setCashCollected(prev => !prev)}
                style={styles.cashRow}>
                <View style={[styles.check, cashCollected && styles.checkOn]}>
                  {cashCollected && <CheckIcon color={Colors.white} size={12} />}
                </View>
                <Text style={styles.cashText}>
                  Cash {formatMoney(cashDue)} collected
                </Text>
              </TouchableOpacity>
            )}
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <AppButton
          title="Complete delivery"
          variant="success"
          onPress={submit}
          loading={busy}
          style={styles.submit}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.surface},
  flex: {flex: 1},
  body: {padding: 20, gap: 13, paddingBottom: 30},

  caption: {
    fontFamily: Fonts.mono,
    fontSize: 11.5,
    color: Colors.textSecondary,
  },

  cardTitle: {fontSize: 15, fontWeight: '800', color: Colors.text},
  cardLead: {
    fontSize: 12.5,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginTop: 6,
  },
  otp: {marginTop: 14},
  error: {
    fontSize: 12.5,
    color: Colors.danger,
    fontWeight: '600',
    marginTop: 10,
    lineHeight: 19,
  },

  steppers: {gap: 10, marginTop: 12, marginBottom: 12},

  cashRow: {flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 12},
  check: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: Colors.borderCircle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: {backgroundColor: Colors.primary, borderColor: Colors.primary},
  cashText: {fontSize: 13.5, fontWeight: '700', color: Colors.text},

  footer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 18,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSoft,
  },
  submit: {height: 56, borderRadius: 15},
});

export default CompleteDeliveryScreen;
