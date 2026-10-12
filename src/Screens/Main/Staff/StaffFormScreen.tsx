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
import PasswordStrength from '../../../Component/Common/PasswordStrength';
import SelectField from '../../../Component/Common/SelectField';
import RestrictedScreen from '../../../Component/People/RestrictedScreen';
import {staffSchema} from '../../../Formik/StaffSchema';
import {useSupplierRoles} from '../../../hooks/useSupplierRoles';
import {apiErrorMessage} from '../../../helper/helperFunction';
import {formatPakistaniPhone, phoneDigits} from '../../../helper/phoneHelper';
import {
  STAFF_ROLES,
  createStaff,
  listStaff,
  staffRoleLabel,
  updateStaff,
  type StaffMember,
  type StaffRole,
  type StaffRoleOption,
  type StaffShopOption,
  type UpdateStaffPayload,
} from '../../../Server/Staff/StaffApi';

type Props = {navigation: any; route: any};

const STATUS_OPTIONS = [
  {value: 'active', label: 'Active', hint: 'Can sign in and work as usual.'},
  {
    value: 'suspended',
    label: 'Suspended',
    hint: "Can't sign in until you set them back to active.",
  },
];

/** Add a manager or rider, or edit one (params: `member?`, `roles`, `shops`). */
const StaffFormScreen: React.FC<Props> = props => {
  const {isOwner} = useSupplierRoles();

  if (!isOwner) {
    return (
      <RestrictedScreen
        title="Staff member"
        heading="Owner only"
        message="Only the shop owner can add or edit managers and riders."
      />
    );
  }

  return <StaffForm {...props} />;
};

/**
 * Ports the portal's StaffFormModal. The email is the login and is set once,
 * on create; a blank password on edit keeps the current one. An edit sends
 * only what changed.
 */
const StaffForm: React.FC<Props> = ({navigation, route}) => {
  const member: StaffMember | undefined = route?.params?.member;
  const isEdit = !!member;
  const current = member?.assignments?.[0];

  const [roles, setRoles] = useState<StaffRoleOption[]>(
    route?.params?.roles ?? [],
  );
  const [shops, setShops] = useState<StaffShopOption[]>(
    route?.params?.shops ?? [],
  );
  const [error, setError] = useState<string | null>(null);

  const schema = useMemo(() => staffSchema(isEdit), [isEdit]);
  // Only active/suspended are settable; any other status shows as active and
  // is left alone unless the owner changes it.
  const initialStatus = member?.status === 'suspended' ? 'suspended' : 'active';

  const formik = useFormik({
    initialValues: {
      name: member?.name ?? '',
      email: member?.email ?? '',
      phone: member?.phone ? formatPakistaniPhone(member.phone) : '',
      password: '',
      role: (current?.role ?? 'supplier_delivery_staff') as string,
      shop_id: String(current?.shop_id ?? shops[0]?.id ?? ''),
      status: initialStatus,
    },
    validationSchema: schema,
    onSubmit: async values => {
      setError(null);
      const phone = values.phone.trim();

      try {
        if (member) {
          const payload: UpdateStaffPayload = {};
          if (values.name.trim() !== member.name) payload.name = values.name.trim();
          if (phoneDigits(phone) !== phoneDigits(member.phone)) {
            payload.phone = phone || null;
          }
          if (values.password) payload.password = values.password;
          if (values.status !== initialStatus) {
            payload.status = values.status as 'active' | 'suspended';
          }
          // A role or shop change replaces the assignment, so the pair goes together.
          if (
            values.role !== current?.role ||
            Number(values.shop_id) !== current?.shop_id
          ) {
            payload.role = values.role as StaffRole;
            payload.shop_id = Number(values.shop_id);
          }

          if (!Object.keys(payload).length) {
            Toast.show({type: 'info', text1: 'Nothing has changed'});
            return;
          }

          const saved = await updateStaff(member.id, payload);
          Toast.show({type: 'success', text1: `${saved.name} updated`});
        } else {
          const saved = await createStaff({
            name: values.name.trim(),
            email: values.email.trim(),
            ...(phone ? {phone} : {}),
            password: values.password,
            role: values.role as StaffRole,
            shop_id: Number(values.shop_id),
          });
          Toast.show({type: 'success', text1: `${saved.name} added`});
        }
        navigation.goBack();
      } catch (err) {
        setError(
          apiErrorMessage(
            err,
            "Couldn't save this staff member. Please try again.",
          ),
        );
      }
    },
  });

  const {setFieldValue} = formik;
  const shopValue = formik.values.shop_id;

  // Opened without the list's dropdown data — fetch it from the same endpoint.
  const needsOptions = !roles.length || !shops.length;
  useEffect(() => {
    if (!needsOptions) return;
    let active = true;
    listStaff({per_page: 1})
      .then(res => {
        if (!active) return;
        if (res.available_roles?.length) setRoles(res.available_roles);
        if (res.shops?.length) setShops(res.shops);
      })
      .catch(err => {
        if (active) {
          Toast.show({
            type: 'error',
            text1: apiErrorMessage(err, 'Could not load your shops.'),
          });
        }
      });
    return () => {
      active = false;
    };
  }, [needsOptions]);

  useEffect(() => {
    if (!shopValue && shops.length) {
      setFieldValue('shop_id', String(shops[0].id));
    }
  }, [shopValue, shops, setFieldValue]);

  const roleOptions = useMemo(() => {
    const options = roles.length
      ? roles.map(role => {
          // "Rider" / "Manager" over the API's long "Supplier Delivery Staff".
          const known = STAFF_ROLES.find(r => r.value === role.slug);
          return {
            value: role.slug,
            label: known?.label ?? (role.name || staffRoleLabel(role.slug)),
            hint: known?.hint,
          };
        })
      : STAFF_ROLES.map(role => ({
          value: role.value as string,
          label: role.label,
          hint: role.hint,
        }));
    if (current && !options.some(option => option.value === current.role)) {
      options.unshift({
        value: current.role,
        label: current.role_name || staffRoleLabel(current.role),
        hint: undefined,
      });
    }
    return options;
  }, [roles, current]);

  const shopOptions = useMemo(() => {
    const options = shops.map(shop => ({
      value: String(shop.id),
      label: shop.public_name,
    }));
    if (current && !options.some(option => option.value === String(current.shop_id))) {
      options.unshift({
        value: String(current.shop_id),
        label: current.shop_name ?? `Shop #${current.shop_id}`,
      });
    }
    return options;
  }, [shops, current]);

  const fieldError = (name: string) =>
    (formik.touched as any)[name] && (formik.errors as any)[name];

  const showStrength = !isEdit || !!formik.values.password;

  /** "Add rider" / "Add manager" — the button says who's being added. */
  const submitLabel =
    formik.values.role === 'supplier_delivery_staff'
      ? 'Add rider'
      : formik.values.role === 'supplier_manager'
      ? 'Add manager'
      : 'Add staff';

  return (
    <View style={styles.screen}>
      <AppHeader
        title={isEdit ? 'Edit staff member' : 'Add staff member'}
        subtitle={isEdit ? member?.name : 'A manager or a rider'}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        {/* Sized to fit one phone screen; the scroll is only for the keyboard
            and very small devices. */}
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled">
          <Card>
            <View style={styles.cardBody}>
              <SelectField
                compact
                label="Role"
                value={formik.values.role}
                options={roleOptions}
                onChange={value => formik.setFieldValue('role', String(value))}
                error={fieldError('role')}
              />
              <SelectField
                compact
                label="Shop"
                placeholder={shopOptions.length ? 'Pick a shop' : 'Loading shops…'}
                value={formik.values.shop_id || null}
                options={shopOptions}
                onChange={value => formik.setFieldValue('shop_id', String(value))}
                error={fieldError('shop_id')}
              />
              {isEdit && (
                <SelectField
                  compact
                  label="Status"
                  value={formik.values.status}
                  options={STATUS_OPTIONS}
                  onChange={value => formik.setFieldValue('status', String(value))}
                  error={fieldError('status')}
                />
              )}

              <View style={styles.divider} />

              <AppInput
                compact
                label="Full name"
                placeholder="Ali Khan"
                autoCapitalize="words"
                value={formik.values.name}
                onChangeText={formik.handleChange('name')}
                onBlur={formik.handleBlur('name')}
                error={fieldError('name')}
              />

              <View style={styles.row}>
                <AppInput
                  compact
                  style={styles.emailCol}
                  label={isEdit ? 'Email (fixed)' : 'Email (login)'}
                  placeholder="ali@shop.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!isEdit}
                  value={formik.values.email}
                  onChangeText={formik.handleChange('email')}
                  onBlur={formik.handleBlur('email')}
                  error={fieldError('email')}
                />
                <AppInput
                  compact
                  style={styles.phoneCol}
                  label="Mobile (optional)"
                  placeholder="03XX-XXXXXXX"
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
              </View>

              <View style={styles.group}>
                <AppInput
                  compact
                  label={isEdit ? 'New password (optional)' : 'Password'}
                  placeholder={isEdit ? 'Blank keeps the current one' : undefined}
                  secure
                  autoCapitalize="none"
                  value={formik.values.password}
                  onChangeText={formik.handleChange('password')}
                  onBlur={formik.handleBlur('password')}
                  error={fieldError('password')}
                />
                {showStrength && (
                  <PasswordStrength value={formik.values.password} />
                )}
              </View>
            </View>
          </Card>

          {!!error && <Text style={styles.error}>{error}</Text>}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <AppButton
          title={isEdit ? 'Save changes' : submitLabel}
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
  body: {paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16, gap: 10},
  cardBody: {gap: 11},
  group: {gap: 8},
  row: {flexDirection: 'row', gap: 10, alignItems: 'flex-start'},
  emailCol: {flex: 1.3},
  phoneCol: {flex: 1},
  divider: {height: 1, backgroundColor: Colors.borderSoft, marginVertical: 1},
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

export default StaffFormScreen;
