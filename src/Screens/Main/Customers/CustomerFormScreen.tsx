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
import Toast from 'react-native-toast-message';

import {Colors} from '../../../Constant/Colors';
import AppButton from '../../../Component/Common/AppButton';
import AppHeader from '../../../Component/Common/AppHeader';
import AppInput from '../../../Component/Common/AppInput';
import Card from '../../../Component/Common/Card';
import InfoNote from '../../../Component/Common/InfoNote';
import SelectField from '../../../Component/Common/SelectField';
import RestrictedScreen from '../../../Component/People/RestrictedScreen';
import {customerSchema} from '../../../Formik/CustomerSchema';
import {useActiveShopId} from '../../../hooks/useActiveShop';
import {useSupplierRoles} from '../../../hooks/useSupplierRoles';
import {apiErrorMessage} from '../../../helper/helperFunction';
import {
  formatPakistaniPhone,
  formatPhoneDisplay,
} from '../../../helper/phoneHelper';
import {
  createShopCustomer,
  listCustomerTypes,
  updateShopCustomer,
  type CustomerPayload,
  type CustomerType,
  type ShopCustomer,
} from '../../../Server/Customers/CustomersApi';

type Props = {navigation: any; route: any};

/** Add a customer to the book, or edit one (params: `customer?`, `types?`). */
const CustomerFormScreen: React.FC<Props> = props => {
  const {isShopManager} = useSupplierRoles();
  const shopId = useActiveShopId();
  const isEdit = !!props.route?.params?.customer;

  if (!isShopManager || !shopId) {
    return (
      <RestrictedScreen
        title={isEdit ? 'Edit customer' : 'Add customer'}
        heading={isShopManager ? 'No shop yet' : 'For owners and managers'}
        message={
          isShopManager
            ? 'No shop is linked to this account yet.'
            : 'Only shop owners and managers can add or edit customers.'
        }
      />
    );
  }

  return <CustomerForm {...props} shopId={shopId} />;
};

/**
 * The form. Mirrors the portal's CustomerFormModal: name and type are
 * required; the phone is locked once the customer signs in with it (an app
 * customer, or a hand-added one given app access) because the API refuses
 * that change.
 */
const CustomerForm: React.FC<Props & {shopId: number}> = ({
  navigation,
  route,
  shopId,
}) => {
  const customer: ShopCustomer | undefined = route?.params?.customer;
  const isEdit = !!customer;
  const phoneLocked =
    !!customer && (customer.source === 'app' || customer.has_app_access);

  const [types, setTypes] = useState<CustomerType[]>(
    route?.params?.types ?? [],
  );
  const [error, setError] = useState<string | null>(null);

  const formik = useFormik({
    initialValues: {
      name: customer?.name ?? '',
      customer_type_id: String(customer?.customer_type_id ?? types[0]?.id ?? ''),
      // A locked number isn't sent, so it stays out of the form (and its validation).
      phone:
        customer?.phone && customer.source === 'shop' && !phoneLocked
          ? formatPakistaniPhone(customer.phone)
          : '',
      address_line: customer?.address_line ?? '',
      area: customer?.area ?? '',
      notes: customer?.notes ?? '',
    },
    validationSchema: customerSchema,
    onSubmit: async values => {
      setError(null);

      // The API takes null to clear an optional field, not an empty string.
      const optional = (value: string) => value.trim() || null;
      const payload: CustomerPayload = {
        name: values.name.trim(),
        customer_type_id: Number(values.customer_type_id),
        address_line: optional(values.address_line),
        area: optional(values.area),
        notes: optional(values.notes),
      };
      const phone = values.phone.trim() || null;

      try {
        if (customer) {
          const saved = await updateShopCustomer(shopId, customer.id, {
            ...payload,
            ...(phoneLocked ? {} : {phone}),
          });
          Toast.show({type: 'success', text1: `${saved.name} updated`});
        } else {
          const saved = await createShopCustomer(shopId, {...payload, phone});
          Toast.show({type: 'success', text1: `${saved.name} added`});
        }
        navigation.goBack();
      } catch (err) {
        setError(
          apiErrorMessage(err, "Couldn't save this customer. Please try again."),
        );
      }
    },
  });

  const {setFieldValue} = formik;
  const typeId = formik.values.customer_type_id;

  // Refresh the types (the list may have passed none), and default a new
  // customer to the first one, as the portal does.
  useEffect(() => {
    let active = true;
    listCustomerTypes()
      .then(next => {
        if (active && next.length) setTypes(next);
      })
      .catch(err => {
        if (active) {
          Toast.show({
            type: 'error',
            text1: apiErrorMessage(err, 'Could not load customer types.'),
          });
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!typeId && types.length) {
      setFieldValue('customer_type_id', String(types[0].id));
    }
  }, [typeId, types, setFieldValue]);

  const typeOptions = useMemo(() => {
    const options = types.map(type => ({
      value: String(type.id),
      label: type.name,
      hint: type.description ?? undefined,
    }));
    // An inactive type isn't in the active list — keep it pickable so an
    // edit doesn't silently move the customer to another type.
    if (
      customer &&
      !options.some(option => option.value === String(customer.customer_type_id))
    ) {
      options.unshift({
        value: String(customer.customer_type_id),
        label: customer.customer_type_name ?? customer.customer_type,
        hint: undefined,
      });
    }
    return options;
  }, [types, customer]);

  const selectedHint = typeOptions.find(option => option.value === typeId)?.hint;

  const fieldError = (name: string) =>
    (formik.touched as any)[name] && (formik.errors as any)[name];

  const field = (name: keyof typeof formik.values) => ({
    value: formik.values[name],
    onChangeText: formik.handleChange(name),
    onBlur: formik.handleBlur(name),
    error: fieldError(name),
  });

  return (
    <View style={styles.screen}>
      <AppHeader
        title={isEdit ? 'Edit customer' : 'Add customer'}
        subtitle={isEdit ? customer?.name : 'A regular or delivery household'}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled">
          <Card>
            <View style={styles.cardBody}>
              <AppInput label="Name" autoCapitalize="words" {...field('name')} />

              <View style={styles.group}>
                <SelectField
                  label="Customer type"
                  placeholder={typeOptions.length ? 'Pick a type' : 'Loading types…'}
                  value={typeId || null}
                  options={typeOptions}
                  onChange={value =>
                    formik.setFieldValue('customer_type_id', String(value))
                  }
                  error={fieldError('customer_type_id')}
                />
                {!!selectedHint && <Text style={styles.hint}>{selectedHint}</Text>}
              </View>
            </View>
          </Card>

          <Card>
            <View style={styles.cardBody}>
              {phoneLocked ? (
                <View style={styles.group}>
                  <AppInput
                    label="Mobile"
                    value={formatPhoneDisplay(customer?.phone, '')}
                    onChangeText={() => {}}
                    editable={false}
                    mono
                  />
                  <Text style={styles.hint}>
                    This customer signs in with this number, so it can't be
                    changed.
                  </Text>
                </View>
              ) : (
                <AppInput
                  label="Mobile (optional)"
                  placeholder="0300-1234567"
                  keyboardType="phone-pad"
                  mono
                  maxLength={12}
                  value={formik.values.phone}
                  onChangeText={value =>
                    formik.setFieldValue('phone', formatPakistaniPhone(value))
                  }
                  onBlur={formik.handleBlur('phone')}
                  error={fieldError('phone')}
                />
              )}

              <AppInput
                label="Address (optional)"
                maxLength={255}
                {...field('address_line')}
              />
              <AppInput label="Area (optional)" maxLength={255} {...field('area')} />
              <AppInput
                label="Notes (optional)"
                placeholder="Gate code, preferred time, number of jars…"
                multiline
                maxLength={1000}
                {...field('notes')}
              />
            </View>
          </Card>

          {!isEdit && (
            <InfoNote>
              Add a mobile number if you want to give this customer app access
              later or place orders for them.
            </InfoNote>
          )}

          {!!error && <Text style={styles.error}>{error}</Text>}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <AppButton
          title={isEdit ? 'Save changes' : 'Add customer'}
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
  group: {gap: 6},
  hint: {fontSize: 12, color: Colors.textMuted, lineHeight: 18},
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

export default CustomerFormScreen;
