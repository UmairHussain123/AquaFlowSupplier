import React, {useState} from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useFormik} from 'formik';
import Toast from 'react-native-toast-message';

import {Colors} from '../../../Constant/Colors';
import AppButton from '../../../Component/Common/AppButton';
import AppHeader from '../../../Component/Common/AppHeader';
import AppInput from '../../../Component/Common/AppInput';
import AppSwitch from '../../../Component/Common/AppSwitch';
import Card from '../../../Component/Common/Card';
import InfoNote from '../../../Component/Common/InfoNote';
import SelectField from '../../../Component/Common/SelectField';
import {productSchema} from '../../../Formik/ProductSchema';
import {useActiveShopId} from '../../../hooks/useActiveShop';
import {apiErrorMessage} from '../../../helper/helperFunction';
import {
  RETURN_MODES,
  addShopProduct,
  deleteShopProduct,
  updateShopProduct,
  type ReturnMode,
  type ShopProduct,
} from '../../../Server/Product/ProductsApi';

/**
 * Add / edit a shop product listing.
 *
 * Two constraints come from the API, not the UI:
 *  - "Add product" takes a numeric `product_id` because the supplier API has no
 *    catalog browse endpoint to pick from.
 *  - `deposit_amount` only applies to `refundable_deposit`; the form forces it
 *    to 0 for the other modes so the payload stays consistent.
 */
const ProductFormScreen: React.FC<{navigation: any; route: any}> = ({
  navigation,
  route,
}) => {
  const shopId = useActiveShopId();
  const listing: ShopProduct | undefined = route?.params?.listing;
  const isEdit = !!listing;

  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const formik = useFormik({
    initialValues: {
      product_id: listing ? String(listing.product_id) : '',
      sku: listing?.sku ?? '',
      price: listing ? String(Number(listing.price)) : '',
      deposit_amount: listing ? String(Number(listing.deposit_amount)) : '0',
      return_mode: (listing?.return_mode ?? 'refundable_deposit') as ReturnMode,
      stock_quantity: listing ? String(listing.stock_quantity) : '0',
      low_stock_threshold: listing ? String(listing.low_stock_threshold) : '5',
      is_active: listing?.is_active ?? true,
    },
    validationSchema: productSchema,
    onSubmit: async values => {
      if (!shopId) return;
      setError(null);

      // The API rejects a deposit on a mode that can't carry one.
      const deposit =
        values.return_mode === 'refundable_deposit'
          ? Number(values.deposit_amount)
          : 0;

      const payload = {
        sku: values.sku.trim(),
        price: Number(values.price),
        deposit_amount: deposit,
        return_mode: values.return_mode,
        stock_quantity: Number(values.stock_quantity),
        low_stock_threshold: Number(values.low_stock_threshold),
        is_active: values.is_active,
      };

      try {
        if (isEdit && listing) {
          await updateShopProduct(shopId, listing.id, payload);
          Toast.show({type: 'success', text1: 'Listing updated'});
        } else {
          await addShopProduct(shopId, {
            ...payload,
            product_id: Number(values.product_id),
          });
          Toast.show({type: 'success', text1: 'Listing added'});
        }
        navigation.goBack();
      } catch (err) {
        setError(apiErrorMessage(err, 'Could not save the listing.'));
      }
    },
  });

  const remove = () => {
    if (!shopId || !listing) return;

    Alert.alert(
      'Remove this listing?',
      'Customers stop seeing it immediately. Order history keeps its own snapshot.',
      [
        {text: 'Keep it', style: 'cancel'},
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteShopProduct(shopId, listing.id);
              Toast.show({type: 'success', text1: 'Listing removed'});
              navigation.goBack();
            } catch (err) {
              setError(apiErrorMessage(err, 'Could not remove the listing.'));
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  const fieldError = (name: string) =>
    (formik.touched as any)[name] && (formik.errors as any)[name];

  const depositApplies = formik.values.return_mode === 'refundable_deposit';

  return (
    <View style={styles.screen}>
      <AppHeader
        title={isEdit ? 'Edit listing' : 'Add product'}
        subtitle={isEdit ? listing?.product?.name ?? undefined : undefined}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled">
          {!isEdit && (
            <>
              <AppInput
                label="Catalog product id"
                value={formik.values.product_id}
                onChangeText={formik.handleChange('product_id')}
                onBlur={formik.handleBlur('product_id')}
                keyboardType="number-pad"
                mono
                error={fieldError('product_id')}
              />
              <InfoNote>
                The supplier API exposes no catalog browse endpoint, so a listing
                points at a master product by its numeric id. Ops can tell you
                the id for the jar or bottle you want to sell.
              </InfoNote>
            </>
          )}

          <Card>
            <View style={styles.cardBody}>
              <AppInput
                label="Your SKU"
                value={formik.values.sku}
                onChangeText={formik.handleChange('sku')}
                onBlur={formik.handleBlur('sku')}
                autoCapitalize="characters"
                mono
                error={fieldError('sku')}
              />

              <AppInput
                label="Price"
                value={formik.values.price}
                onChangeText={formik.handleChange('price')}
                onBlur={formik.handleBlur('price')}
                keyboardType="decimal-pad"
                mono
                suffix="Rs"
                error={fieldError('price')}
              />

              <SelectField
                label="How the container comes back"
                value={formik.values.return_mode}
                options={RETURN_MODES.map(mode => ({
                  value: mode.value,
                  label: mode.label,
                  hint: mode.hint,
                }))}
                onChange={value => {
                  formik.setFieldValue('return_mode', value);
                  if (value !== 'refundable_deposit') {
                    formik.setFieldValue('deposit_amount', '0');
                  }
                }}
                error={fieldError('return_mode')}
              />

              <AppInput
                label="Deposit"
                value={formik.values.deposit_amount}
                onChangeText={formik.handleChange('deposit_amount')}
                onBlur={formik.handleBlur('deposit_amount')}
                keyboardType="decimal-pad"
                mono
                suffix="Rs"
                editable={depositApplies}
                error={fieldError('deposit_amount')}
              />
              {!depositApplies && (
                <Text style={styles.helper}>
                  A deposit only applies to a refundable-deposit container.
                </Text>
              )}
            </View>
          </Card>

          <Card>
            <View style={styles.cardBody}>
              <View style={styles.pair}>
                <AppInput
                  label="Stock"
                  value={formik.values.stock_quantity}
                  onChangeText={formik.handleChange('stock_quantity')}
                  onBlur={formik.handleBlur('stock_quantity')}
                  keyboardType="number-pad"
                  mono
                  editable={!isEdit}
                  error={fieldError('stock_quantity')}
                  style={styles.flex}
                />
                <AppInput
                  label="Low-stock at"
                  value={formik.values.low_stock_threshold}
                  onChangeText={formik.handleChange('low_stock_threshold')}
                  onBlur={formik.handleBlur('low_stock_threshold')}
                  keyboardType="number-pad"
                  mono
                  error={fieldError('low_stock_threshold')}
                  style={styles.flex}
                />
              </View>

              {isEdit && (
                <Text style={styles.helper}>
                  Stock is changed through Adjust stock so every movement carries
                  a reason.
                </Text>
              )}

              <View style={styles.switchRow}>
                <View style={styles.flex}>
                  <Text style={styles.switchTitle}>Listed to customers</Text>
                  <Text style={styles.helper}>
                    Turn off to hide it without removing the listing.
                  </Text>
                </View>
                <AppSwitch
                  value={formik.values.is_active}
                  onValueChange={value => formik.setFieldValue('is_active', value)}
                />
              </View>
            </View>
          </Card>

          {!!error && <Text style={styles.error}>{error}</Text>}

          {isEdit && (
            <AppButton
              title="Remove listing"
              variant="danger"
              onPress={remove}
              loading={deleting}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <AppButton
          title={isEdit ? 'Save changes' : 'Add listing'}
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
  cardBody: {gap: 12},
  pair: {flexDirection: 'row', gap: 10},
  helper: {fontSize: 12, color: Colors.textMuted, lineHeight: 18},
  switchRow: {flexDirection: 'row', alignItems: 'center', gap: 12},
  switchTitle: {fontSize: 14, fontWeight: '800', color: Colors.text},
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

export default ProductFormScreen;
