import React, {useCallback, useState} from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {useFormik} from 'formik';
import Toast from 'react-native-toast-message';

import {Colors} from '../../../Constant/Colors';
import {Fonts} from '../../../Constant/Fonts';
import AppButton from '../../../Component/Common/AppButton';
import AppHeader from '../../../Component/Common/AppHeader';
import AppInput from '../../../Component/Common/AppInput';
import AppModal from '../../../Component/Common/AppModal';
import Card from '../../../Component/Common/Card';
import EmptyState from '../../../Component/Common/EmptyState';
import InfoNote from '../../../Component/Common/InfoNote';
import KeyValueRow from '../../../Component/Common/KeyValueRow';
import ScreenLoader from '../../../Component/Common/ScreenLoader';
import {serviceZoneSchema} from '../../../Formik/ShopSettingsSchema';
import {useActiveShopId} from '../../../hooks/useActiveShop';
import {apiErrorMessage, formatMoney} from '../../../helper/helperFunction';
import {getOpsDraft} from '../../../helper/opsDraft';
import {
  createServiceZone,
  deleteServiceZone,
  listServiceZones,
  updateServiceZone,
  zoneLabel,
  type ServiceZone,
} from '../../../Server/ShopSettings/ShopSettingsApi';

/**
 * Delivery zones.
 *
 * A zone is either `radius` or `polygon`. The app creates radius zones only — a
 * polygon's shape can't be drawn here — so for an existing polygon the form
 * edits just the fee, minimum and ETA and says so.
 */
const ServiceZonesScreen: React.FC = () => {
  const shopId = useActiveShopId();

  const [zones, setZones] = useState<ServiceZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ServiceZone | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!shopId) {
      setLoading(false);
      return;
    }
    try {
      setZones(await listServiceZones(shopId));
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: apiErrorMessage(err, 'Could not load your delivery zones.'),
      });
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      radius_km: editing?.radius_km ? String(Number(editing.radius_km)) : '5',
      delivery_fee: editing ? String(Number(editing.delivery_fee)) : '40',
      minimum_order_amount: editing
        ? String(Number(editing.minimum_order_amount))
        : '300',
      estimated_delivery_minutes: editing
        ? String(editing.estimated_delivery_minutes)
        : '45',
    },
    validationSchema: serviceZoneSchema,
    onSubmit: async values => {
      if (!shopId) return;
      setError(null);

      const payload = {
        zone_type: 'radius',
        radius_km: Number(values.radius_km),
        delivery_fee: Number(values.delivery_fee),
        minimum_order_amount: Number(values.minimum_order_amount),
        estimated_delivery_minutes: Number(values.estimated_delivery_minutes),
      };

      try {
        if (editing) {
          // A polygon keeps its shape — send only the numbers this form owns.
          const patch =
            editing.zone_type === 'polygon'
              ? {
                  delivery_fee: payload.delivery_fee,
                  minimum_order_amount: payload.minimum_order_amount,
                  estimated_delivery_minutes: payload.estimated_delivery_minutes,
                }
              : payload;

          const updated = await updateServiceZone(shopId, editing.id, patch);
          setZones(prev =>
            prev.map(zone => (zone.id === updated.id ? updated : zone)),
          );
          Toast.show({type: 'success', text1: 'Zone updated'});
        } else {
          const created = await createServiceZone(shopId, payload);
          setZones(prev => [...prev, created]);
          Toast.show({type: 'success', text1: 'Zone added'});
        }
        close();
      } catch (err) {
        setError(apiErrorMessage(err, 'Could not save the zone.'));
      }
    },
  });

  const openCreate = async () => {
    // First zone? Start from the numbers given during the application.
    if (!zones.length) {
      const draft = await getOpsDraft();
      if (draft) {
        formik.setValues({
          radius_km: draft.radiusKm,
          delivery_fee: draft.deliveryFee,
          minimum_order_amount: draft.minimumOrder,
          estimated_delivery_minutes: draft.etaMinutes,
        });
      }
    }
    setCreating(true);
  };

  const close = () => {
    setCreating(false);
    setEditing(null);
    setError(null);
  };

  const remove = (zone: ServiceZone) => {
    if (!shopId) return;
    Alert.alert(
      'Remove this zone?',
      'Customers inside it stop seeing your shop.',
      [
        {text: 'Keep it', style: 'cancel'},
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteServiceZone(shopId, zone.id);
              setZones(prev => prev.filter(row => row.id !== zone.id));
              Toast.show({type: 'success', text1: 'Zone removed'});
            } catch (err) {
              Toast.show({
                type: 'error',
                text1: apiErrorMessage(err, 'Could not remove the zone.'),
              });
            }
          },
        },
      ],
    );
  };

  const fieldError = (name: string) =>
    (formik.touched as any)[name] && (formik.errors as any)[name];

  if (loading) return <ScreenLoader />;

  const isPolygon = editing?.zone_type === 'polygon';

  return (
    <View style={styles.screen}>
      <AppHeader
        title="Service area & fees"
        right={
          <TouchableOpacity onPress={openCreate}>
            <Text style={styles.add}>Add</Text>
          </TouchableOpacity>
        }
      />

      <FlatList
        data={zones}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.body}
        renderItem={({item}) => (
          <Card>
            <View style={styles.head}>
              <Text style={styles.zoneTitle}>{zoneLabel(item)}</Text>
              <TouchableOpacity onPress={() => setEditing(item)}>
                <Text style={styles.link}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => remove(item)}>
                <Text style={styles.remove}>Remove</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.lines}>
              <KeyValueRow
                label="Delivery fee"
                value={formatMoney(item.delivery_fee)}
              />
              <KeyValueRow
                label="Minimum order"
                value={formatMoney(item.minimum_order_amount)}
              />
              <KeyValueRow
                label="Estimated delivery"
                value={`${item.estimated_delivery_minutes} min`}
              />
            </View>
          </Card>
        )}
        ListEmptyComponent={
          <EmptyState
            title="No delivery zone yet"
            message="Customers can only find you once at least one zone covers them."
            actionLabel="Add your first zone"
            onAction={openCreate}
          />
        }
        ListFooterComponent={
          <InfoNote>
            Admin caps the maximum radius and fee per area, so a zone can come
            back adjusted after review.
          </InfoNote>
        }
      />

      <AppModal
        visible={creating || !!editing}
        title={editing ? 'Edit zone' : 'Add delivery zone'}
        subtitle={
          isPolygon
            ? "This is a custom-shaped area. Its shape can't be edited here — only the fee, minimum and ETA."
            : undefined
        }
        onClose={close}
        footer={
          <>
            <AppButton title="Cancel" variant="secondary" onPress={close} />
            <AppButton
              title={editing ? 'Save zone' : 'Add zone'}
              onPress={formik.handleSubmit as any}
              loading={formik.isSubmitting}
            />
          </>
        }>
        {!isPolygon && (
          <AppInput
            label="Radius"
            value={formik.values.radius_km}
            onChangeText={formik.handleChange('radius_km')}
            onBlur={formik.handleBlur('radius_km')}
            keyboardType="decimal-pad"
            mono
            suffix="km"
            error={fieldError('radius_km')}
          />
        )}

        <AppInput
          label="Delivery fee"
          value={formik.values.delivery_fee}
          onChangeText={formik.handleChange('delivery_fee')}
          onBlur={formik.handleBlur('delivery_fee')}
          keyboardType="decimal-pad"
          mono
          suffix="Rs"
          error={fieldError('delivery_fee')}
        />

        <AppInput
          label="Minimum order"
          value={formik.values.minimum_order_amount}
          onChangeText={formik.handleChange('minimum_order_amount')}
          onBlur={formik.handleBlur('minimum_order_amount')}
          keyboardType="decimal-pad"
          mono
          suffix="Rs"
          error={fieldError('minimum_order_amount')}
        />

        <AppInput
          label="Estimated delivery"
          value={formik.values.estimated_delivery_minutes}
          onChangeText={formik.handleChange('estimated_delivery_minutes')}
          onBlur={formik.handleBlur('estimated_delivery_minutes')}
          keyboardType="number-pad"
          mono
          suffix="min"
          error={fieldError('estimated_delivery_minutes')}
        />

        {!!error && <Text style={styles.error}>{error}</Text>}
      </AppModal>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.surface},
  add: {fontSize: 13, fontWeight: '800', color: Colors.primary},
  body: {padding: 20, gap: 11, paddingBottom: 30},

  head: {flexDirection: 'row', alignItems: 'center', gap: 14},
  zoneTitle: {
    flex: 1,
    fontFamily: Fonts.mono,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  link: {fontSize: 12.5, fontWeight: '800', color: Colors.primary},
  remove: {fontSize: 12.5, fontWeight: '800', color: Colors.danger},
  lines: {gap: 9, marginTop: 12},

  error: {fontSize: 12.5, color: Colors.danger, fontWeight: '600'},
});

export default ServiceZonesScreen;
