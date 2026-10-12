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
import Route from '../../../Constant/NavigationStrings';
import AppButton from '../../../Component/Common/AppButton';
import AppHeader from '../../../Component/Common/AppHeader';
import AppInput from '../../../Component/Common/AppInput';
import AppSwitch from '../../../Component/Common/AppSwitch';
import Card from '../../../Component/Common/Card';
import SelectField from '../../../Component/Common/SelectField';
import CatalogProductPicker from '../../../Component/Catalog/CatalogProductPicker';
import {productSchema} from '../../../Formik/ProductSchema';
import {useActiveShopId} from '../../../hooks/useActiveShop';
import {apiErrorMessage} from '../../../helper/helperFunction';
import {
  RETURN_MODES,
  addShopProduct,
  deleteShopProduct,
  productLabel,
  productSize,
  updateShopProduct,
  type CatalogPickerProduct,
  type ReturnMode,
  type ShopProduct,
} from '../../../Server/Product/ProductsApi';

/** "Nestle Pure Life · 19L · Nestle" — what the edit header names the listing by. */
const listingTitle = (listing: ShopProduct): string =>
  [
    productLabel(listing),
    listing.product ? productSize(listing.product) : null,
    listing.product?.brand?.name,
  ]
    .filter(Boolean)
    .join(' · ');

/**
 * Add / edit a shop product listing.
 *
 *  - A new listing picks its master product from the catalog
 *    (GET /supplier/products); products the shop already sells are greyed out.
 *  - `deposit_amount` only applies to `refundable_deposit`; the form forces it
 *    to 0 for the other modes so the payload stays consistent.
 *  - Editing stock here overwrites the count, as on the portal. It is only
 *    sent when changed, so an untouched form can't undo an adjustment made
 *    meanwhile.
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
  const [picked, setPicked] = useState<CatalogPickerProduct | null>(null);

  const formik = useFormik({
    initialValues: {
      product_id: listing ? String(listing.product_id) : '',
      sku: listing?.sku ?? '',
      price: listing ? String(Number(listing.price)) : '',
      deposit_amount: listing ? String(Number(listing.deposit_amount)) : '0',
      return_mode: (listing?.return_mode ?? 'refundable_deposit') as ReturnMode,
      stock_quantity: listing ? String(listing.stock_quantity) : '0',
      low_stock_threshold: listing ? String(listing.low_stock_threshold) : '10',
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
          const {stock_quantity, ...rest} = payload;
          await updateShopProduct(
            shopId,
            listing.id,
            stock_quantity === listing.stock_quantity
              ? rest
              : {...rest, stock_quantity},
          );
          Toast.show({
            type: 'success',
            text1: `${productLabel(listing)} updated`,
          });
        } else {
          const saved = await addShopProduct(shopId, {
            ...payload,
            product_id: Number(values.product_id),
          });
          Toast.show({
            type: 'success',
            text1: `${saved?.product?.name ?? 'Product'} added to your shop`,
          });
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
        subtitle={listing ? listingTitle(listing) : undefined}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled">
          {isEdit && listing ? (
            <Card>
              <Text style={styles.productName}>{productLabel(listing)}</Text>
              <Text style={styles.productMeta}>
                {[
                  listing.product ? productSize(listing.product) : null,
                  listing.product?.brand?.name,
                  listing.product?.category?.name,
                  `catalog ID ${listing.product_id}`,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </Card>
          ) : shopId ? (
            <View style={styles.picker}>
              <CatalogProductPicker
                shopId={shopId}
                selected={picked}
                error={formik.submitCount > 0 && formik.errors.product_id}
                onSelect={product => {
                  setPicked(product);
                  formik.setFieldValue(
                    'product_id',
                    product ? String(product.id) : '',
                  );
                }}
              />
              <Text style={styles.helper}>
                The master catalog product this listing sells. Aqua Flow ops
                maintain that catalog.
              </Text>
            </View>
          ) : null}

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

              {isEdit && listing && (
                <Text style={styles.helper}>
                  Editing stock here overwrites the count. To log a delivery or
                  a loss with a reason,{' '}
                  <Text
                    style={styles.link}
                    onPress={() =>
                      navigation.replace(Route.AdjustStockScreen, {listing})
                    }>
                    use Adjust stock
                  </Text>{' '}
                  instead.
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
                  onValueChange={value =>
                    formik.setFieldValue('is_active', value)
                  }
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
  picker: {gap: 8},
  productName: {fontSize: 15, fontWeight: '800', color: Colors.text},
  productMeta: {fontSize: 12.5, color: Colors.textSecondary, marginTop: 3},
  link: {color: Colors.primary, fontWeight: '800'},
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
