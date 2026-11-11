import React, {useCallback, useEffect, useState} from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {launchCamera} from 'react-native-image-picker';
import {useFocusEffect} from '@react-navigation/native';
import Toast from 'react-native-toast-message';

import {Colors} from '../../../Constant/Colors';
import AppButton from '../../../Component/Common/AppButton';
import AppHeader from '../../../Component/Common/AppHeader';
import AppInput from '../../../Component/Common/AppInput';
import Card from '../../../Component/Common/Card';
import EmptyState from '../../../Component/Common/EmptyState';
import InfoNote from '../../../Component/Common/InfoNote';
import ScreenLoader from '../../../Component/Common/ScreenLoader';
import SelectField from '../../../Component/Common/SelectField';
import {CheckIcon} from '../../../Component/Icons/TabIcons';
import {useActiveShopId} from '../../../hooks/useActiveShop';
import {useSupplierRoles} from '../../../hooks/useSupplierRoles';
import {apiErrorMessage, formatMoney, toNumber} from '../../../helper/helperFunction';
import {
  ensureCameraPermission,
  permissionAlert,
} from '../../../helper/permissionHelper';
import {getCurrentCoordinates} from '../../../helper/locationHelper';
import {
  completeOrder,
  deliverOrderWithoutOtp,
  getOrder,
  isShopPlaced,
} from '../../../Server/Order/OrdersApi';
import {HANDOVER_REASON_LABELS, type HandoverReason, type OrderDetail} from '../../../Server/Order/OrderType';

const REASON_OPTIONS = (
  Object.keys(HANDOVER_REASON_LABELS) as HandoverReason[]
).map(value => ({value, label: HANDOVER_REASON_LABELS[value]}));

type PickedPhoto = {uri: string; name: string; type: string; capturedAt: string};

/**
 * The rider's escape hatch when the customer has no code to give — handed to
 * a family member, a neighbor, or some other arrangement. The server can't
 * tell a live photo from an old one, so the camera is the only source here;
 * there is no gallery picker.
 */
const DeliverWithoutOtpScreen: React.FC<{navigation: any; route: any}> = ({
  navigation,
  route,
}) => {
  const shopId = useActiveShopId();
  const {isShopManager} = useSupplierRoles();
  const orderId = route?.params?.orderId;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [reason, setReason] = useState<HandoverReason>('family_member');
  const [recipientName, setRecipientName] = useState('');
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [cashCollected, setCashCollected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Best-effort — a missing fix never blocks the delivery, it's just absent
  // from the request.
  const [coords, setCoords] = useState<{latitude: number; longitude: number} | null>(
    null,
  );

  const load = useCallback(async () => {
    if (!shopId || !orderId) {
      setLoadError('This order could not be found.');
      setLoading(false);
      return;
    }
    try {
      const detail = await getOrder(shopId, orderId);
      setOrder(detail);
      setCashCollected(detail.payment_status === 'paid');
      setLoadError(null);
    } catch (err) {
      const message = apiErrorMessage(err, 'Could not load the order.');
      setLoadError(message);
      Toast.show({type: 'error', text1: message});
    } finally {
      setLoading(false);
    }
  }, [orderId, shopId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    getCurrentCoordinates()
      .then(setCoords)
      .catch(() => {
        // Silent — the field is optional and a dialog here would just be noise.
      });
  }, []);

  const takePhoto = async () => {
    try {
      await ensureCameraPermission();
    } catch (err) {
      permissionAlert(
        'Camera is blocked',
        err,
        'Could not open the camera. Allow it in Settings and try again.',
      );
      return;
    }

    let result;
    try {
      result = await launchCamera({
        mediaType: 'photo',
        quality: 0.7,
        maxWidth: 1600,
        maxHeight: 1600,
        saveToPhotos: false,
      });
    } catch {
      Toast.show({type: 'error', text1: 'Could not open the camera.'});
      return;
    }

    if (result.didCancel) return;

    if (result.errorCode) {
      Toast.show({
        type: 'error',
        text1:
          result.errorCode === 'permission'
            ? 'Aqua Flow needs camera permission. Allow it in Settings and try again.'
            : result.errorCode === 'camera_unavailable'
            ? 'No camera is available on this device.'
            : result.errorMessage ?? 'Could not take that photo.',
      });
      return;
    }

    const asset = result.assets?.[0];
    if (!asset?.uri) return;

    setPhoto({
      uri: asset.uri,
      name: asset.fileName ?? `proof-${Date.now()}.jpg`,
      type: asset.type ?? 'image/jpeg',
      // The moment the shot lands here is as close as JS gets to the shutter —
      // the server rejects anything it doesn't trust as close to "now".
      capturedAt: new Date().toISOString(),
    });
    setError(null);
  };

  if (loading) return <ScreenLoader />;

  if (!order) {
    return (
      <View style={styles.screen}>
        <AppHeader title="Deliver without code" />
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

  // Shop-placed orders already skip OTP — this screen has nothing to add there.
  if (isShopPlaced(order) || order.order_status !== 'out_for_delivery') {
    return (
      <View style={styles.screen}>
        <AppHeader title="Deliver without code" />
        <EmptyState
          title="Not available for this order"
          message={
            isShopPlaced(order)
              ? "This order has no delivery code to begin with — use Complete delivery instead."
              : 'This order is no longer out for delivery.'
          }
          actionLabel="Go back"
          onAction={() => navigation.goBack()}
        />
      </View>
    );
  }

  const isCod = order.payment_method?.toLowerCase() === 'cod';
  const cashDue = toNumber(order.total_amount);
  const needsRecipientName = reason === 'family_member' || reason === 'neighbor';
  const needsNote = reason === 'other';

  const submit = async () => {
    if (!shopId) return;

    if (needsRecipientName && !recipientName.trim()) {
      setError("Enter who the order was handed to.");
      return;
    }
    if (needsNote && !note.trim()) {
      setError('Say what happened — this reason needs a note.');
      return;
    }
    if (!photo) {
      setError('Take a photo of the handover before closing this delivery.');
      return;
    }
    if (isCod && !cashCollected) {
      setError(`Confirm you collected ${formatMoney(cashDue)} before closing.`);
      return;
    }

    setError(null);
    setBusy(true);

    try {
      await deliverOrderWithoutOtp(shopId, order.id, {
        reason,
        recipient_name: needsRecipientName ? recipientName.trim() : undefined,
        note: needsNote ? note.trim() : undefined,
        photo: {uri: photo.uri, name: photo.name, type: photo.type},
        captured_at: photo.capturedAt,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
      });

      // Same close-out as the normal OTP path — leave nothing half-finished for
      // shops that expect the order closed the moment it's handed over.
      if (isShopManager) {
        try {
          await completeOrder(shopId, order.id);
        } catch {
          // Some shops have ops close the order instead — not an error.
        }
      }

      Toast.show({
        type: 'success',
        text1: 'Delivery completed',
        text2: 'The customer can still contest it from their app.',
      });
      navigation.goBack();
    } catch (err: any) {
      if (err?.response?.status === 409) {
        setError('This order changed in the meantime — reloading it.');
        await load();
        return;
      }
      setError(
        apiErrorMessage(err, 'Could not confirm the delivery. Try again.'),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.screen}>
      <AppHeader title={order.order_number} subtitle="Deliver without code" mono />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled">
          <InfoNote tone="warning">
            Use this only when {order.customer?.name ?? 'the customer'} has no
            code to give — handed to a family member, a neighbor, or some other
            arrangement. They'll see the photo in their app and can contest it.
          </InfoNote>

          <Card>
            <Text style={styles.cardTitle}>Who was it handed to</Text>
            <View style={styles.field}>
              <SelectField
                label="Reason"
                value={reason}
                options={REASON_OPTIONS}
                onChange={value => setReason(value as HandoverReason)}
              />
            </View>

            {needsRecipientName && (
              <View style={styles.field}>
                <AppInput
                  label="Recipient's name"
                  value={recipientName}
                  onChangeText={setRecipientName}
                  placeholder="e.g. Sara (sister)"
                  maxLength={100}
                />
              </View>
            )}

            {needsNote && (
              <View style={styles.field}>
                <AppInput
                  label="What happened"
                  value={note}
                  onChangeText={setNote}
                  placeholder="e.g. Left with the building guard, ID checked."
                  maxLength={255}
                  multiline
                />
              </View>
            )}
          </Card>

          <Card>
            <Text style={styles.cardTitle}>Proof photo</Text>
            <Text style={styles.cardLead}>
              Required. Taken now, from the camera only.
            </Text>

            {photo ? (
              <View style={styles.photoWrap}>
                <Image source={{uri: photo.uri}} style={styles.photo} />
                <TouchableOpacity
                  style={styles.retake}
                  onPress={takePhoto}
                  activeOpacity={0.85}>
                  <Text style={styles.retakeText}>Retake</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.camera}
                onPress={takePhoto}
                activeOpacity={0.85}>
                <Text style={styles.cameraText}>Open camera</Text>
              </TouchableOpacity>
            )}
          </Card>

          <Card>
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

          {!!error && <Text style={styles.error}>{error}</Text>}
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

  cardTitle: {fontSize: 15, fontWeight: '800', color: Colors.text},
  cardLead: {
    fontSize: 12.5,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginTop: 4,
    marginBottom: 12,
  },
  field: {marginTop: 12},

  camera: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.borderDashed,
    borderRadius: 14,
    paddingVertical: 28,
    alignItems: 'center',
  },
  cameraText: {fontSize: 14, fontWeight: '800', color: Colors.primary},
  photoWrap: {gap: 10},
  photo: {width: '100%', height: 220, borderRadius: 14, backgroundColor: Colors.surface3},
  retake: {alignSelf: 'flex-start'},
  retakeText: {fontSize: 13, fontWeight: '800', color: Colors.primary},

  cashRow: {flexDirection: 'row', alignItems: 'center', gap: 11},
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

  error: {
    fontSize: 12.5,
    color: Colors.danger,
    fontWeight: '600',
    lineHeight: 19,
  },

  footer: {
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
  submit: {height: 56, borderRadius: 15},
});

export default DeliverWithoutOtpScreen;
