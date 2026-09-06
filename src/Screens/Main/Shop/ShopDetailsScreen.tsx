import React, {useState} from 'react';
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
import InfoNote from '../../../Component/Common/InfoNote';
import SectionHeader from '../../../Component/Common/SectionHeader';
import {shopDetailsSchema} from '../../../Formik/ShopSettingsSchema';
import {useActiveShop} from '../../../hooks/useActiveShop';
import {upsertShop} from '../../../Redux/slices/shopSlice';
import {updateShop, type UpdateShopPayload} from '../../../Server/Shops/ShopsApi';
import {apiErrorMessage} from '../../../helper/helperFunction';

/**
 * SC1a — Shop details.
 *
 * The public-facing half of the shop record: what customers see on the listing
 * and how a rider finds the place. `status` is the admin approval state and
 * isn't editable here — pausing yourself is the Store status toggle on SC1.
 *
 *   PUT /supplier/shops/{shop}
 */
const ShopDetailsScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const dispatch = useDispatch();
  const shop = useActiveShop();
  const [error, setError] = useState<string | null>(null);

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      public_name: shop?.public_name ?? '',
      branch_name: shop?.branch_name ?? '',
      description: shop?.description ?? '',
      address_line: shop?.address_line ?? '',
      landmark: shop?.landmark ?? '',
      city: shop?.city ?? '',
      area: shop?.area ?? '',
      contact_phone: shop?.contact_phone ?? '',
      whatsapp_number: shop?.whatsapp_number ?? '',
      capacity_per_day:
        shop?.capacity_per_day != null ? String(shop.capacity_per_day) : '',
    },
    validationSchema: shopDetailsSchema,
    onSubmit: async values => {
      if (!shop) return;
      setError(null);

      // The API takes null to clear an optional field, not an empty string.
      const optional = (value: string) => value.trim() || null;

      const payload: UpdateShopPayload = {
        public_name: values.public_name.trim(),
        branch_name: optional(values.branch_name),
        description: optional(values.description),
        address_line: values.address_line.trim(),
        landmark: optional(values.landmark),
        city: values.city.trim(),
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
  });

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

  return (
    <View style={styles.screen}>
      <AppHeader title="Shop details" subtitle="What customers see" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled">
          <SectionHeader title="Listing" />
          <Card>
            <AppInput label="Shop name" {...field('public_name')} />
            <AppInput
              label="Branch"
              placeholder="Optional — e.g. DHA Phase 6"
              {...field('branch_name')}
            />
            <AppInput
              label="Description"
              placeholder="One line customers read on your listing"
              multiline
              {...field('description')}
            />
          </Card>

          <SectionHeader title="Where you are" />
          <Card>
            <AppInput label="Address" multiline {...field('address_line')} />
            <AppInput
              label="Landmark"
              placeholder="Optional — helps a rider find you"
              {...field('landmark')}
            />
            <AppInput label="Area" {...field('area')} />
            <AppInput label="City" {...field('city')} />
            <Text style={styles.hint}>
              The map pin ({Number(shop.latitude).toFixed(4)},{' '}
              {Number(shop.longitude).toFixed(4)}) is set from your application.
              Raise a support ticket to move it.
            </Text>
          </Card>

          <SectionHeader title="Contact & capacity" />
          <Card>
            <AppInput
              label="Contact phone"
              keyboardType="phone-pad"
              mono
              {...field('contact_phone')}
            />
            <AppInput
              label="WhatsApp"
              placeholder="Optional"
              keyboardType="phone-pad"
              mono
              {...field('whatsapp_number')}
            />
            <AppInput
              label="Orders per day"
              placeholder="Leave empty for no cap"
              keyboardType="number-pad"
              mono
              {...field('capacity_per_day')}
            />
            <Text style={styles.hint}>
              A daily cap stops new orders once you hit it, so you don't take
              more than you can fill.
            </Text>
          </Card>

          {!!error && <Text style={styles.error}>{error}</Text>}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <AppButton
          title="Save changes"
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
  body: {padding: 18, gap: 11, paddingBottom: 30},
  hint: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
    marginTop: 4,
  },
  error: {fontSize: 13, color: Colors.danger, fontWeight: '600'},
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
});

export default ShopDetailsScreen;
