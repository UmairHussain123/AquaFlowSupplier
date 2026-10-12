import React, {useEffect, useMemo, useState} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useFormik} from 'formik';
import {useDispatch} from 'react-redux';
import Toast from 'react-native-toast-message';

import {Colors} from '../../../Constant/Colors';
import AppButton from '../../../Component/Common/AppButton';
import AppHeader from '../../../Component/Common/AppHeader';
import AppInput from '../../../Component/Common/AppInput';
import Card from '../../../Component/Common/Card';
import EmptyState from '../../../Component/Common/EmptyState';
import InfoNote from '../../../Component/Common/InfoNote';
import SelectField from '../../../Component/Common/SelectField';
import {shopDetailsSchema} from '../../../Formik/ShopSettingsSchema';
import {useActiveShop} from '../../../hooks/useActiveShop';
import {useSupplierRoles} from '../../../hooks/useSupplierRoles';
import {upsertShop} from '../../../Redux/slices/shopSlice';
import {
  capacityLabel,
  updateShop,
  type UpdateShopPayload,
} from '../../../Server/Shops/ShopsApi';
import {
  cityId,
  cityName,
  listCities,
  type City,
} from '../../../Server/Cities/CitiesApi';
import {apiErrorMessage} from '../../../helper/helperFunction';
import {formatPakistaniPhone} from '../../../helper/phoneHelper';

/** Case-insensitive name match — the shop's stored city may differ in case from the directory. */
const sameCity = (a: string, b: string) =>
  a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * SC1a — Shop details.
 *
 * The public-facing half of the shop record: what customers see on the listing
 * and how a rider finds the place. `status` is the admin approval state and
 * isn't editable here — pausing yourself is the Store status toggle on SC1.
 * Only the owner edits these; a manager sees them read-only, as on the portal.
 *
 *   PUT /supplier/shops/{shop}
 *   GET /supplier/cities
 */
const ShopDetailsScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const dispatch = useDispatch();
  const shop = useActiveShop();
  const {isOwner, isShopManager} = useSupplierRoles();
  const [error, setError] = useState<string | null>(null);

  const [cities, setCities] = useState<City[]>([]);
  const [loadingCities, setLoadingCities] = useState(true);
  const [citiesFailed, setCitiesFailed] = useState(false);

  useEffect(() => {
    if (!isShopManager) {
      setLoadingCities(false);
      return;
    }
    let active = true;
    listCities()
      .then(data => {
        if (active) setCities(data);
      })
      .catch(() => {
        // Not fatal — the shop's current city still shows and saves by name.
        if (active) setCitiesFailed(true);
      })
      .finally(() => {
        if (active) setLoadingCities(false);
      });
    return () => {
      active = false;
    };
  }, [isShopManager]);

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      public_name: shop?.public_name ?? '',
      branch_name: shop?.branch_name ?? '',
      description: shop?.description ?? '',
      address_line: shop?.address_line ?? '',
      landmark: shop?.landmark ?? '',
      city: cityName(shop?.city),
      area: shop?.area ?? '',
      contact_phone: formatPakistaniPhone(shop?.contact_phone ?? ''),
      whatsapp_number: formatPakistaniPhone(shop?.whatsapp_number ?? ''),
      capacity_per_day:
        shop?.capacity_per_day != null ? String(shop.capacity_per_day) : '',
    },
    validationSchema: shopDetailsSchema,
    onSubmit: async values => {
      if (!shop || !isOwner) return;
      setError(null);

      // The API takes null to clear an optional field, not an empty string.
      const optional = (value: string) => value.trim() || null;

      // Send the directory id when the city is one we know; the name goes too,
      // as the portal does, so an unlisted legacy city still saves.
      const selectedCity = cities.find(c => sameCity(c.name, values.city));
      const keptId = sameCity(values.city, cityName(shop.city))
        ? cityId(shop.city)
        : null;

      const payload: UpdateShopPayload = {
        public_name: values.public_name.trim(),
        branch_name: optional(values.branch_name),
        description: optional(values.description),
        address_line: values.address_line.trim(),
        landmark: optional(values.landmark),
        city_id: selectedCity?.id ?? keptId ?? undefined,
        city: selectedCity?.name ?? values.city.trim(),
        area: values.area.trim(),
        contact_phone: values.contact_phone.trim(),
        whatsapp_number: optional(values.whatsapp_number),
        capacity_per_day: values.capacity_per_day.trim()
          ? Number(values.capacity_per_day)
          : null,
      };

      try {
        dispatch(upsertShop(await updateShop(shop.id, payload)));
        Toast.show({type: 'success', text1: 'Shop details saved'});
        navigation.goBack();
      } catch (err) {
        setError(apiErrorMessage(err, 'Could not save your shop details.'));
      }
    },
  });

  const fieldError = (name: string) =>
    (formik.touched as any)[name] && (formik.errors as any)[name];

  const field = (name: string) => ({
    value: (formik.values as any)[name] as string,
    onChangeText: formik.handleChange(name),
    onBlur: formik.handleBlur(name),
    error: fieldError(name),
    editable: isOwner,
  });

  /** Phone inputs run through the 03XX-XXXXXXX mask as they're typed. */
  const phoneField = (name: 'contact_phone' | 'whatsapp_number') => ({
    ...field(name),
    onChangeText: (text: string) =>
      formik.setFieldValue(name, formatPakistaniPhone(text)),
    keyboardType: 'phone-pad' as const,
    placeholder: '03XX-XXXXXXX',
    maxLength: 12,
    mono: true,
  });

  /** Directory cities, with the shop's current one kept even if it isn't listed. */
  const cityOptions = useMemo(() => {
    const options = cities.map(city => ({
      value: city.name,
      label: city.is_active ? city.name : `${city.name} (not served yet)`,
      hint: city.is_active
        ? city.province
        : [city.province, 'Aqua Flow is not live here yet']
            .filter(Boolean)
            .join(' · '),
    }));
    const current = cityName(shop?.city);
    if (current && !cities.some(city => sameCity(city.name, current))) {
      options.unshift({value: current, label: current, hint: 'Current city'});
    }
    return options;
  }, [cities, shop?.city]);

  // The picker's value is the directory's spelling of the current city.
  const cityValue =
    cityOptions.find(option => sameCity(String(option.value), formik.values.city))
      ?.value ?? null;

  if (!isShopManager) {
    return (
      <View style={styles.screen}>
        <AppHeader title="Shop details" />
        <View style={styles.body}>
          <Card>
            <EmptyState
              title="For owners and managers"
              message="Shop settings are for shop owners and managers. Ask your shop owner if something on the listing needs changing."
            />
          </Card>
        </View>
      </View>
    );
  }

  if (!shop) {
    return (
      <View style={styles.screen}>
        <AppHeader title="Shop details" />
        <View style={styles.body}>
          <InfoNote tone="warning">
            No shop is linked to this account yet.
          </InfoNote>
        </View>
      </View>
    );
  }

  const dirty = formik.dirty;

  return (
    <View style={styles.screen}>
      <AppHeader
        title="Shop details"
        subtitle={`What customers see · ${capacityLabel(shop)}`}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled">
          {!isOwner && (
            <InfoNote tone="neutral">
              View only — only the owner can change shop details.
            </InfoNote>
          )}

          {shop.status === 'paused' && (
            <InfoNote tone="warning">
              Paused by Aqua Flow. Your open switch won't reopen the shop until
              they resume it.
            </InfoNote>
          )}
          {shop.status === 'suspended' && (
            <InfoNote tone="warning">
              Your shop is on hold with Aqua Flow — support can lift it.
            </InfoNote>
          )}

          <Text style={styles.sectionLabel}>Listing</Text>
          <Card style={styles.cardBody}>
            <AppInput compact label="Shop name" {...field('public_name')} />
            <AppInput
              compact
              label="Branch (optional)"
              placeholder="DHA Phase 6"
              {...field('branch_name')}
            />
            <AppInput
              compact
              label="Description"
              placeholder="One line customers read on your listing"
              multiline
              {...field('description')}
            />
          </Card>

          <Text style={styles.sectionLabel}>Location</Text>
          <Card style={styles.cardBody}>
            <AppInput
              compact
              label="Address"
              multiline
              {...field('address_line')}
            />
            <View style={styles.row}>
              <AppInput
                compact
                style={styles.col}
                label="Area"
                {...field('area')}
              />
              <View style={styles.col}>
                <SelectField
                  compact
                  label="City"
                  placeholder={loadingCities ? 'Loading…' : 'Pick city'}
                  value={cityValue}
                  options={cityOptions}
                  disabled={!isOwner || loadingCities || !cityOptions.length}
                  onChange={value => {
                    formik.setFieldTouched('city', true, false);
                    formik.setFieldValue('city', String(value));
                  }}
                  error={fieldError('city')}
                />
              </View>
            </View>
            <AppInput
              compact
              label="Landmark (optional)"
              placeholder="Helps a rider find you"
              {...field('landmark')}
            />
            {citiesFailed && (
              <Text style={styles.hint}>
                Couldn't load the city list — your current city is kept.
              </Text>
            )}
            <Text style={styles.hint}>
              Map pin {Number(shop.latitude).toFixed(4)},{' '}
              {Number(shop.longitude).toFixed(4)} · raise a support ticket to
              move it.
            </Text>
          </Card>

          <Text style={styles.sectionLabel}>Contact and capacity</Text>
          <Card style={styles.cardBody}>
            <View style={styles.row}>
              <AppInput
                compact
                style={styles.col}
                label="Contact phone"
                {...phoneField('contact_phone')}
              />
              <AppInput
                compact
                style={styles.col}
                label="WhatsApp (optional)"
                {...phoneField('whatsapp_number')}
              />
            </View>
            <AppInput
              compact
              label="Orders per day"
              placeholder="Empty means no daily cap"
              keyboardType="number-pad"
              {...field('capacity_per_day')}
            />
            <Text style={styles.hint}>
              New orders stop for the day once the cap is reached.
            </Text>
          </Card>

          {!!error && <Text style={styles.error}>{error}</Text>}
        </ScrollView>
      </KeyboardAvoidingView>

      {isOwner && (
        <View style={styles.footer}>
          <AppButton
            title={dirty ? 'Save changes' : 'Saved'}
            onPress={formik.handleSubmit as any}
            loading={formik.isSubmitting}
            disabled={!dirty}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.surface},
  flex: {flex: 1},
  body: {paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20, gap: 9},
  cardBody: {gap: 11},
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    marginTop: 4,
    marginLeft: 4,
  },
  row: {flexDirection: 'row', gap: 10, alignItems: 'flex-start'},
  col: {flex: 1},
  hint: {fontSize: 11.5, color: Colors.textMuted, lineHeight: 16},
  error: {fontSize: 13, color: Colors.danger, fontWeight: '600'},
  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSoft,
    shadowColor: 'rgba(11,27,43,1)',
    shadowOpacity: 0.07,
    shadowRadius: 26,
    shadowOffset: {width: 0, height: -8},
    elevation: 12,
  },
});

export default ShopDetailsScreen;
