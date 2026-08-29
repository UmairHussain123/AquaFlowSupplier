import React, {useEffect, useMemo, useState} from 'react';
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

import {Colors} from '../../Constant/Colors';
import {Fonts} from '../../Constant/Fonts';
import Route from '../../Constant/NavigationStrings';
import AppButton from '../../Component/Common/AppButton';
import AppInput from '../../Component/Common/AppInput';
import Card from '../../Component/Common/Card';
import InfoNote from '../../Component/Common/InfoNote';
import OptionCard from '../../Component/Common/OptionCard';
import PasswordChecklist from '../../Component/Common/PasswordChecklist';
import ProgressSteps from '../../Component/Common/ProgressSteps';
import {ChevronLeft} from '../../Component/Icons/TabIcons';
import {APPLY_STEPS, applySchema} from '../../Formik/ApplySchema';
import {apiErrorMessage} from '../../helper/helperFunction';
import {
  DEFAULT_OPS_DRAFT,
  clearApplicationDraft,
  getApplicationDraft,
  saveApplicationDraft,
  saveOpsDraft,
  saveSubmittedApplication,
  type OpsDraft,
} from '../../helper/opsDraft';
import {SUPPLIER_TYPES} from '../../Server/AuthType/authType';
import {applySupplierRequest} from '../../Server/User';
import DocumentPicker, {type PickedFile} from './ApplySteps/DocumentPicker';
import {DAY_INITIALS, WEEK_ORDER} from '../../Server/ShopSettings/ShopSettingsApi';

/**
 * SA2–SA5 — the four-step supplier application, submitted in one
 * `POST /supplier/apply` call at the end.
 *
 * Two steps collect things that call has no field for:
 *  - Step 3 (documents) records what the supplier has ready; there is no
 *    document-upload endpoint on the supplier API — ops collect evidence during
 *    verification.
 *  - Step 4's hours and service area are kept as a local draft and pre-fill
 *    Shop settings once the shop exists (a shop id is needed before the
 *    business-hours and service-zone endpoints can be called at all).
 */
const STEP_TITLES = [
  'Supplier application',
  'Shop & owner details',
  'Documents',
  'Operations & payout',
];

const initialValues = {
  supplier_type: '',
  name: '',
  email: '',
  password: '',
  owner_name: '',
  legal_name: '',
  cnic_number: '',
  shop_public_name: '',
  shop_branch_name: '',
  shop_description: '',
  shop_address_line: '',
  shop_landmark: '',
  shop_city: '',
  shop_area: '',
  shop_latitude: '',
  shop_longitude: '',
  shop_contact_phone: '',
  shop_whatsapp_number: '',
};

const ApplyScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [ops, setOps] = useState<OpsDraft>(DEFAULT_OPS_DRAFT);
  const [documents, setDocuments] = useState<Record<string, PickedFile[]>>({});

  const formik = useFormik({
    initialValues,
    validationSchema: applySchema,
    onSubmit: async values => {
      setError(null);
      try {
        const application = await applySupplierRequest({
          name: values.name.trim(),
          email: values.email.trim(),
          password: values.password,
          supplier_type: values.supplier_type as any,
          owner_name: values.owner_name.trim(),
          legal_name: values.legal_name.trim() || values.shop_public_name.trim(),
          cnic_number: values.cnic_number.trim(),
          shop_public_name: values.shop_public_name.trim(),
          shop_branch_name: values.shop_branch_name.trim(),
          shop_description: values.shop_description.trim(),
          shop_address_line: values.shop_address_line.trim(),
          shop_landmark: values.shop_landmark.trim(),
          shop_city: values.shop_city.trim(),
          shop_area: values.shop_area.trim(),
          shop_latitude: Number(values.shop_latitude),
          shop_longitude: Number(values.shop_longitude),
          shop_contact_phone: values.shop_contact_phone.trim(),
          shop_whatsapp_number: values.shop_whatsapp_number.trim(),
        });

        await saveOpsDraft(ops);
        await saveSubmittedApplication(application);
        await clearApplicationDraft();

        Toast.show({
          type: 'success',
          text1: 'Application submitted',
          text2: 'Ops review takes 2–3 working days.',
        });
        navigation.replace(Route.ApplicationStatusScreen, {application});
      } catch (err) {
        setError(apiErrorMessage(err, 'Could not submit your application.'));
      }
    },
  });

  // Restore a saved draft on mount so "Save draft" survives leaving the app.
  useEffect(() => {
    getApplicationDraft().then(draft => {
      if (draft) formik.setValues({...initialValues, ...draft});
    });
    // Run once — re-running on every formik change would fight the user's typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const supplierType = formik.values.supplier_type;

  /** Which documents this supplier type has to have ready. */
  const requiredDocuments = useMemo(() => {
    const base = [
      {
        id: 'cnic',
        title: 'Owner CNIC (front & back)',
        hint: 'Must match the owner name above',
        required: true,
      },
      {
        id: 'licence',
        title: 'Food / business licence',
        hint: 'Trade licence for the shop or plant',
        required: true,
      },
      {
        id: 'photos',
        title: 'Shop & plant photos',
        hint: 'Signboard, inside, filling area · min 3',
        required: false,
      },
    ];

    if (supplierType === 'filtration_plant' || supplierType === 'hybrid') {
      base.splice(2, 0, {
        id: 'lab_report',
        title: 'Laboratory water test report',
        hint: 'Not later than 6 months old',
        required: true,
      });
    }

    if (supplierType === 'reseller' || supplierType === 'brand_distributor') {
      base.splice(2, 0, {
        id: 'brand_authorization',
        title: 'Brand authorization letter',
        hint: 'From the brand you resell or distribute',
        required: true,
      });
    }

    return base;
  }, [supplierType]);

  const goNext = async () => {
    const fields = APPLY_STEPS[step].fields;
    const errors = await formik.validateForm();
    const stepErrors = fields.filter(field => (errors as any)[field]);

    if (stepErrors.length) {
      formik.setTouched(
        fields.reduce((acc, field) => ({...acc, [field]: true}), formik.touched),
      );
      return;
    }

    if (step < APPLY_STEPS.length - 1) {
      setStep(step + 1);
    } else {
      formik.handleSubmit();
    }
  };

  const goBack = () => {
    if (step === 0) navigation.goBack();
    else setStep(step - 1);
  };

  const saveDraft = async () => {
    await saveApplicationDraft(formik.values);
    await saveOpsDraft(ops);
    Toast.show({type: 'success', text1: 'Draft saved on this device'});
  };

  const fieldError = (name: keyof typeof initialValues) =>
    (formik.touched as any)[name] && (formik.errors as any)[name];

  const toggleDay = (day: number) =>
    setOps(prev => ({
      ...prev,
      openDays: prev.openDays.includes(day)
        ? prev.openDays.filter(d => d !== day)
        : [...prev.openDays, day],
    }));

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={goBack} hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}>
            <ChevronLeft color={Colors.text} size={20} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{STEP_TITLES[step]}</Text>
          <Text style={styles.headerCount}>{step + 1} / 4</Text>
        </View>
        <ProgressSteps total={4} current={step + 1} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled">
          {/* ---------- Step 1 · supplier type + account ---------- */}
          {step === 0 && (
            <>
              <View>
                <Text style={styles.stepTitle}>What kind of supplier are you?</Text>
                <Text style={styles.stepLead}>
                  Required documents depend on this answer.
                </Text>
              </View>

              {SUPPLIER_TYPES.map(type => (
                <OptionCard
                  key={type.value}
                  title={type.label}
                  description={type.description}
                  selected={formik.values.supplier_type === type.value}
                  onPress={() => formik.setFieldValue('supplier_type', type.value)}
                />
              ))}
              {!!fieldError('supplier_type') && (
                <Text style={styles.error}>{fieldError('supplier_type')}</Text>
              )}

              <Card>
                <Text style={styles.cardTitle}>Your sign-in</Text>
                <View style={styles.cardBody}>
                  <AppInput
                    label="Full name"
                    value={formik.values.name}
                    onChangeText={formik.handleChange('name')}
                    onBlur={formik.handleBlur('name')}
                    error={fieldError('name')}
                  />
                  <AppInput
                    label="Email"
                    value={formik.values.email}
                    onChangeText={formik.handleChange('email')}
                    onBlur={formik.handleBlur('email')}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    error={fieldError('email')}
                  />
                  <AppInput
                    label="Password"
                    value={formik.values.password}
                    onChangeText={formik.handleChange('password')}
                    onBlur={formik.handleBlur('password')}
                    secure
                    autoCapitalize="none"
                    error={fieldError('password')}
                  />
                  <PasswordChecklist value={formik.values.password} />
                </View>
              </Card>

              <InfoNote>
                You can save a draft and continue later. Nothing is public until
                ops approve.
              </InfoNote>
            </>
          )}

          {/* ---------- Step 2 · shop, owner and GPS pin ---------- */}
          {step === 1 && (
            <>
              <Card>
                <View style={styles.cardBody}>
                  <AppInput
                    label="Shop / public name"
                    value={formik.values.shop_public_name}
                    onChangeText={formik.handleChange('shop_public_name')}
                    onBlur={formik.handleBlur('shop_public_name')}
                    error={fieldError('shop_public_name')}
                  />
                  <AppInput
                    label="Legal name"
                    value={formik.values.legal_name}
                    onChangeText={formik.handleChange('legal_name')}
                    onBlur={formik.handleBlur('legal_name')}
                    placeholder="Same as shop name if unregistered"
                    error={fieldError('legal_name')}
                  />
                  <AppInput
                    label="Branch name"
                    value={formik.values.shop_branch_name}
                    onChangeText={formik.handleChange('shop_branch_name')}
                    placeholder="Optional"
                  />
                  <AppInput
                    label="Owner full name (as on CNIC)"
                    value={formik.values.owner_name}
                    onChangeText={formik.handleChange('owner_name')}
                    onBlur={formik.handleBlur('owner_name')}
                    error={fieldError('owner_name')}
                  />
                  <AppInput
                    label="CNIC number"
                    value={formik.values.cnic_number}
                    onChangeText={formik.handleChange('cnic_number')}
                    placeholder="42101-1234567-1"
                    mono
                  />
                  <AppInput
                    label="About the shop"
                    value={formik.values.shop_description}
                    onChangeText={formik.handleChange('shop_description')}
                    placeholder="What you sell and how you fill"
                    multiline
                  />
                </View>
              </Card>

              <Card>
                <Text style={styles.cardTitle}>Shop location</Text>
                <View style={styles.cardBody}>
                  <AppInput
                    label="Address"
                    value={formik.values.shop_address_line}
                    onChangeText={formik.handleChange('shop_address_line')}
                    onBlur={formik.handleBlur('shop_address_line')}
                    error={fieldError('shop_address_line')}
                  />
                  <AppInput
                    label="Landmark"
                    value={formik.values.shop_landmark}
                    onChangeText={formik.handleChange('shop_landmark')}
                    placeholder="Optional"
                  />
                  <View style={styles.pair}>
                    <AppInput
                      label="City"
                      value={formik.values.shop_city}
                      onChangeText={formik.handleChange('shop_city')}
                      onBlur={formik.handleBlur('shop_city')}
                      error={fieldError('shop_city')}
                      style={styles.flex}
                    />
                    <AppInput
                      label="Area"
                      value={formik.values.shop_area}
                      onChangeText={formik.handleChange('shop_area')}
                      onBlur={formik.handleBlur('shop_area')}
                      error={fieldError('shop_area')}
                      style={styles.flex}
                    />
                  </View>
                  <View style={styles.pair}>
                    <AppInput
                      label="Latitude"
                      value={formik.values.shop_latitude}
                      onChangeText={formik.handleChange('shop_latitude')}
                      onBlur={formik.handleBlur('shop_latitude')}
                      keyboardType="numeric"
                      mono
                      error={fieldError('shop_latitude')}
                      style={styles.flex}
                    />
                    <AppInput
                      label="Longitude"
                      value={formik.values.shop_longitude}
                      onChangeText={formik.handleChange('shop_longitude')}
                      onBlur={formik.handleBlur('shop_longitude')}
                      keyboardType="numeric"
                      mono
                      error={fieldError('shop_longitude')}
                      style={styles.flex}
                    />
                  </View>
                  <Text style={styles.helper}>
                    This pin decides which customers can see you. Ops verify it
                    against your shop photos before approval.
                  </Text>
                </View>
              </Card>

              <InfoNote tone="warning">
                The pickup point can differ from the shopfront — pin the door
                your rider actually leaves from.
              </InfoNote>
            </>
          )}

          {/* ---------- Step 3 · documents ---------- */}
          {step === 2 && (
            <>
              <Text style={styles.stepLead}>
                Required for a{' '}
                <Text style={styles.strong}>
                  {SUPPLIER_TYPES.find(t => t.value === supplierType)?.label ??
                    'supplier'}
                </Text>
                . Photos of the paper are fine if the numbers are readable.
              </Text>

              {requiredDocuments.map(doc => (
                <DocumentPicker
                  key={doc.id}
                  title={doc.title}
                  hint={doc.hint}
                  required={doc.required}
                  files={documents[doc.id] ?? []}
                  onChange={files =>
                    setDocuments(prev => ({...prev, [doc.id]: files}))
                  }
                />
              ))}

              <InfoNote>
                Private evidence is never shown to customers — only the evidence
                type and valid-through date appear on your shop page. Ops collect
                the files themselves during verification, so what you attach here
                stays on this device as your own checklist.
              </InfoNote>
            </>
          )}

          {/* ---------- Step 4 · operations, contact and payout ---------- */}
          {step === 3 && (
            <>
              <Card>
                <Text style={styles.cardTitle}>Order contact</Text>
                <View style={styles.cardBody}>
                  <AppInput
                    label="Order phone"
                    value={formik.values.shop_contact_phone}
                    onChangeText={formik.handleChange('shop_contact_phone')}
                    onBlur={formik.handleBlur('shop_contact_phone')}
                    keyboardType="phone-pad"
                    mono
                    error={fieldError('shop_contact_phone')}
                  />
                  <AppInput
                    label="WhatsApp number"
                    value={formik.values.shop_whatsapp_number}
                    onChangeText={formik.handleChange('shop_whatsapp_number')}
                    keyboardType="phone-pad"
                    mono
                    placeholder="Optional"
                  />
                </View>
              </Card>

              <Card>
                <Text style={styles.cardTitle}>Delivery hours</Text>
                <View style={styles.cardBody}>
                  <View style={styles.pair}>
                    <AppInput
                      label="Opens"
                      value={ops.opensAt}
                      onChangeText={value => setOps({...ops, opensAt: value})}
                      placeholder="09:00"
                      mono
                      style={styles.flex}
                    />
                    <AppInput
                      label="Closes"
                      value={ops.closesAt}
                      onChangeText={value => setOps({...ops, closesAt: value})}
                      placeholder="22:00"
                      mono
                      style={styles.flex}
                    />
                  </View>

                  <View style={styles.days}>
                    {WEEK_ORDER.map(day => {
                      const on = ops.openDays.includes(day);
                      return (
                        <TouchableOpacity
                          key={day}
                          onPress={() => toggleDay(day)}
                          style={[styles.day, on && styles.dayOn]}>
                          <Text style={[styles.dayText, on && styles.dayTextOn]}>
                            {DAY_INITIALS[day]}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </Card>

              <Card>
                <Text style={styles.cardTitle}>Service area & fees</Text>
                <View style={styles.cardBody}>
                  <View style={styles.pair}>
                    <AppInput
                      label="Radius (km)"
                      value={ops.radiusKm}
                      onChangeText={value => setOps({...ops, radiusKm: value})}
                      keyboardType="numeric"
                      mono
                      style={styles.flex}
                    />
                    <AppInput
                      label="Min order"
                      value={ops.minimumOrder}
                      onChangeText={value => setOps({...ops, minimumOrder: value})}
                      keyboardType="numeric"
                      mono
                      suffix="Rs"
                      style={styles.flex}
                    />
                  </View>
                  <View style={styles.pair}>
                    <AppInput
                      label="Delivery fee"
                      value={ops.deliveryFee}
                      onChangeText={value => setOps({...ops, deliveryFee: value})}
                      keyboardType="numeric"
                      mono
                      suffix="Rs"
                      style={styles.flex}
                    />
                    <AppInput
                      label="Daily capacity"
                      value={ops.dailyCapacity}
                      onChangeText={value => setOps({...ops, dailyCapacity: value})}
                      keyboardType="numeric"
                      mono
                      style={styles.flex}
                    />
                  </View>
                  <Text style={styles.helper}>
                    Admin caps the maximum radius and fee per area. These values
                    pre-fill Shop settings once your shop is approved.
                  </Text>
                </View>
              </Card>

              <Card>
                <Text style={styles.cardTitle}>Payout account</Text>
                <InfoNote tone="warning">
                  Bank details are collected by ops during verification, not in
                  this form. The account title must match the owner name —
                  changing it later needs OTP and re-verification, which holds
                  payouts.
                </InfoNote>
              </Card>

              {!!error && <Text style={styles.error}>{error}</Text>}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <AppButton
          title="Save draft"
          variant="secondary"
          onPress={saveDraft}
          block={false}
          style={styles.draftButton}
        />
        <AppButton
          title={step === 3 ? 'Submit application' : 'Continue'}
          variant={step === 3 ? 'success' : 'primary'}
          onPress={goNext}
          loading={formik.isSubmitting}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.surface},
  flex: {flex: 1},

  header: {
    backgroundColor: Colors.white,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 16,
    gap: 13,
  },
  headerRow: {flexDirection: 'row', alignItems: 'center', gap: 12},
  headerTitle: {flex: 1, fontSize: 16.5, fontWeight: '800', color: Colors.text},
  headerCount: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: Colors.textSecondary,
  },

  body: {padding: 20, gap: 13, paddingBottom: 30},
  stepTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: Colors.text,
  },
  stepLead: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginTop: 5,
  },
  strong: {color: Colors.text, fontWeight: '800'},
  cardTitle: {fontSize: 14.5, fontWeight: '800', color: Colors.text},
  cardBody: {gap: 12, marginTop: 12},
  pair: {flexDirection: 'row', gap: 10},
  helper: {fontSize: 12, color: Colors.textSecondary, lineHeight: 18},
  error: {fontSize: 13, color: Colors.danger, fontWeight: '600'},

  days: {flexDirection: 'row', gap: 6},
  day: {
    flex: 1,
    height: 34,
    borderRadius: 9,
    backgroundColor: Colors.borderSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayOn: {backgroundColor: Colors.primary},
  dayText: {fontSize: 11.5, fontWeight: '800', color: Colors.textMuted},
  dayTextOn: {color: Colors.white},

  footer: {
    flexDirection: 'row',
    gap: 11,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 18,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSoft,
  },
  draftButton: {width: 110},
});

export default ApplyScreen;
