import React, {useState} from 'react';
import {StyleSheet, Text} from 'react-native';
import {useFormik} from 'formik';
import * as Yup from 'yup';
import {Colors} from '../../Constant/Colors';
import {apiErrorMessage} from '../../helper/helperFunction';
import {
  createPayoutAccount,
  type ManagedPayoutAccount,
} from '../../Server/Settlements/SettlementsApi';
import AppButton from '../Common/AppButton';
import AppInput from '../Common/AppInput';
import AppModal from '../Common/AppModal';
import InfoNote from '../Common/InfoNote';

/**
 * Same rules as the portal's add-account form: a title and a (maskable)
 * account number are required, the rest is optional. An IBAN is at most 34
 * characters, letters and digits only.
 */
export const payoutAccountSchema = Yup.object().shape({
  account_title: Yup.string()
    .trim()
    .max(255, 'Keep the title under 255 characters')
    .required('Account title is required'),
  bank_name: Yup.string()
    .trim()
    .max(255, 'Keep the bank name under 255 characters'),
  account_number_masked: Yup.string()
    .trim()
    .max(255, 'Keep the account number under 255 characters')
    .required('Account number is required'),
  iban: Yup.string()
    .trim()
    .matches(/^[A-Za-z0-9 ]*$/, 'An IBAN only has letters and digits')
    .test(
      'iban-length',
      'An IBAN is at most 34 characters',
      value => !value || value.replace(/\s/g, '').length <= 34,
    ),
  wallet_provider: Yup.string()
    .trim()
    .max(255, 'Keep the wallet name under 255 characters'),
});

const INITIAL_VALUES = {
  account_title: '',
  bank_name: '',
  account_number_masked: '',
  iban: '',
  wallet_provider: '',
};

/** The bottom sheet for adding a bank account or wallet to be paid into. */
const AddPayoutAccountSheet: React.FC<{
  visible: boolean;
  onClose: () => void;
  onSaved: (account: ManagedPayoutAccount) => void;
}> = ({visible, onClose, onSaved}) => {
  const [error, setError] = useState<string | null>(null);

  const formik = useFormik({
    initialValues: INITIAL_VALUES,
    validationSchema: payoutAccountSchema,
    onSubmit: async (values, helpers) => {
      setError(null);
      const bank = values.bank_name.trim();
      const iban = values.iban.replace(/\s/g, '').toUpperCase();
      const wallet = values.wallet_provider.trim();

      try {
        const saved = await createPayoutAccount({
          account_title: values.account_title.trim(),
          account_number_masked: values.account_number_masked.trim(),
          ...(bank ? {bank_name: bank} : {}),
          ...(iban ? {iban} : {}),
          ...(wallet ? {wallet_provider: wallet} : {}),
        });
        helpers.resetForm();
        onSaved(saved);
      } catch (err) {
        setError(
          apiErrorMessage(err, "Couldn't add this account. Please try again."),
        );
      }
    },
  });

  const close = () => {
    if (formik.isSubmitting) return;
    formik.resetForm();
    setError(null);
    onClose();
  };

  const fieldError = (name: keyof typeof INITIAL_VALUES) =>
    formik.touched[name] && formik.errors[name];

  return (
    <AppModal
      visible={visible}
      title="Add payout account"
      subtitle="Where Aqua Flow sends your settlements."
      onClose={close}
      footer={
        <>
          <AppButton title="Cancel" variant="secondary" onPress={close} />
          <AppButton
            title="Add account"
            onPress={formik.handleSubmit as any}
            loading={formik.isSubmitting}
          />
        </>
      }>
      <AppInput
        label="Account title"
        value={formik.values.account_title}
        onChangeText={formik.handleChange('account_title')}
        onBlur={formik.handleBlur('account_title')}
        placeholder="Name on the account"
        autoCapitalize="words"
        error={fieldError('account_title')}
      />

      <AppInput
        label="Bank (optional)"
        value={formik.values.bank_name}
        onChangeText={formik.handleChange('bank_name')}
        onBlur={formik.handleBlur('bank_name')}
        placeholder="Meezan Bank"
        autoCapitalize="words"
        error={fieldError('bank_name')}
      />

      <AppInput
        label="Account number"
        value={formik.values.account_number_masked}
        onChangeText={formik.handleChange('account_number_masked')}
        onBlur={formik.handleBlur('account_number_masked')}
        placeholder="****1234"
        autoCapitalize="none"
        mono
        error={fieldError('account_number_masked')}
      />
      <Text style={styles.helper}>
        This is what shows on screens, so you can mask it. Aqua Flow checks the
        full details before verifying.
      </Text>

      <AppInput
        label="IBAN (optional)"
        value={formik.values.iban}
        onChangeText={formik.handleChange('iban')}
        onBlur={formik.handleBlur('iban')}
        placeholder="PK36SCBL0000001123456702"
        autoCapitalize="characters"
        maxLength={42}
        mono
        error={fieldError('iban')}
      />

      <AppInput
        label="Mobile wallet (optional)"
        value={formik.values.wallet_provider}
        onChangeText={formik.handleChange('wallet_provider')}
        onBlur={formik.handleBlur('wallet_provider')}
        placeholder="JazzCash, Easypaisa…"
        autoCapitalize="words"
        error={fieldError('wallet_provider')}
      />

      <InfoNote>
        A new account starts unverified. Nothing is paid into it until Aqua Flow
        has checked the details.
      </InfoNote>

      {!!error && <Text style={styles.error}>{error}</Text>}
    </AppModal>
  );
};

const styles = StyleSheet.create({
  helper: {
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 18,
    marginTop: -6,
  },
  error: {fontSize: 13, color: Colors.danger, fontWeight: '600'},
});

export default AddPayoutAccountSheet;
