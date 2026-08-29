import React, {useState} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFormik} from 'formik';
import Toast from 'react-native-toast-message';

import {Colors} from '../../../Constant/Colors';
import {Fonts} from '../../../Constant/Fonts';
import AppButton from '../../../Component/Common/AppButton';
import AppHeader from '../../../Component/Common/AppHeader';
import AppInput from '../../../Component/Common/AppInput';
import Card from '../../../Component/Common/Card';
import InfoNote from '../../../Component/Common/InfoNote';
import SelectField from '../../../Component/Common/SelectField';
import {adjustStockSchema} from '../../../Formik/ProductSchema';
import {useActiveShopId} from '../../../hooks/useActiveShop';
import {apiErrorMessage} from '../../../helper/helperFunction';
import {
  STOCK_REASONS,
  adjustShopProductStock,
  productLabel,
  type ShopProduct,
} from '../../../Server/Product/ProductsApi';

/** A signed stock movement with a reason — the audited path to changing stock. */
const AdjustStockScreen: React.FC<{navigation: any; route: any}> = ({
  navigation,
  route,
}) => {
  const shopId = useActiveShopId();
  const listing: ShopProduct = route?.params?.listing;
  const [error, setError] = useState<string | null>(null);

  const formik = useFormik({
    initialValues: {change_quantity: '', reason: 'restock', notes: ''},
    validationSchema: adjustStockSchema,
    onSubmit: async values => {
      if (!shopId || !listing) return;
      setError(null);
      try {
        const updated = await adjustShopProductStock(shopId, listing.id, {
          change_quantity: Number(values.change_quantity),
          reason: values.reason,
          notes: values.notes.trim() || undefined,
        });
        Toast.show({
          type: 'success',
          text1: `Stock is now ${updated.stock_quantity}`,
        });
        navigation.goBack();
      } catch (err) {
        setError(apiErrorMessage(err, 'Could not adjust the stock.'));
      }
    },
  });

  const change = Number(formik.values.change_quantity) || 0;
  const projected = (listing?.stock_quantity ?? 0) + change;

  const quickSet = (value: number) =>
    formik.setFieldValue('change_quantity', String(value));

  const fieldError = (name: string) =>
    (formik.touched as any)[name] && (formik.errors as any)[name];

  return (
    <View style={styles.screen}>
      <AppHeader
        title="Adjust stock"
        subtitle={listing ? productLabel(listing) : undefined}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled">
          <Card>
            <View style={styles.summary}>
              <View style={styles.flex}>
                <Text style={styles.summaryLabel}>Current stock</Text>
                <Text style={styles.summaryValue}>
                  {listing?.stock_quantity ?? 0}
                </Text>
              </View>
              <Text style={styles.arrow}>→</Text>
              <View style={styles.flex}>
                <Text style={styles.summaryLabel}>After this change</Text>
                <Text
                  style={[
                    styles.summaryValue,
                    projected < 0 && {color: Colors.danger},
                  ]}>
                  {projected}
                </Text>
              </View>
            </View>
          </Card>

          <View style={styles.quickRow}>
            {[-10, -5, -1, 1, 5, 10].map(step => (
              <TouchableOpacity
                key={step}
                onPress={() => quickSet(step)}
                style={styles.quick}>
                <Text style={styles.quickText}>
                  {step > 0 ? `+${step}` : step}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <AppInput
            label="Change (+ adds, − removes)"
            value={formik.values.change_quantity}
            onChangeText={formik.handleChange('change_quantity')}
            onBlur={formik.handleBlur('change_quantity')}
            keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
            mono
            error={fieldError('change_quantity')}
          />

          <SelectField
            label="Reason"
            value={formik.values.reason}
            options={STOCK_REASONS.map(reason => ({
              value: reason.value,
              label: reason.label,
            }))}
            onChange={value => formik.setFieldValue('reason', value)}
            error={fieldError('reason')}
          />

          <AppInput
            label="Notes"
            value={formik.values.notes}
            onChangeText={formik.handleChange('notes')}
            placeholder="Optional — what happened"
            multiline
          />

          {projected < 0 && (
            <InfoNote tone="warning">
              This takes stock below zero. Use a stock-take correction instead if
              the count itself was wrong.
            </InfoNote>
          )}

          {!!error && <Text style={styles.error}>{error}</Text>}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <AppButton
          title="Save adjustment"
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

  summary: {flexDirection: 'row', alignItems: 'center', gap: 12},
  summaryLabel: {fontSize: 11.5, color: Colors.textMuted, fontWeight: '700'},
  summaryValue: {
    fontFamily: Fonts.mono,
    fontSize: 26,
    fontWeight: '800',
    color: Colors.text,
    marginTop: 3,
  },
  arrow: {color: Colors.textMuted, fontSize: 18},

  quickRow: {flexDirection: 'row', gap: 7},
  quick: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickText: {fontFamily: Fonts.mono, fontSize: 13, fontWeight: '700', color: Colors.primary},

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

export default AdjustStockScreen;
