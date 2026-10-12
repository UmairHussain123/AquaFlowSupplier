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
import Toast from 'react-native-toast-message';

import {Colors} from '../../../Constant/Colors';
import AppButton from '../../../Component/Common/AppButton';
import AppHeader from '../../../Component/Common/AppHeader';
import AppInput from '../../../Component/Common/AppInput';
import Card from '../../../Component/Common/Card';
import InfoNote from '../../../Component/Common/InfoNote';
import PasswordChecklist from '../../../Component/Common/PasswordChecklist';
import {
  apiFieldErrors,
  changePasswordSchema,
} from '../../../Formik/AccountSchema';
import {changePassword} from '../../../Server/Account/AccountApi';
import {apiErrorMessage} from '../../../helper/helperFunction';

/**
 * Change your own password. A wrong current password comes back as a 422 on
 * `current_password` and shows under that field.
 *
 *   PUT /supplier/password
 */
const ChangePasswordScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const [error, setError] = useState<string | null>(null);

  const formik = useFormik({
    initialValues: {
      current_password: '',
      password: '',
      password_confirmation: '',
    },
    validationSchema: changePasswordSchema,
    onSubmit: async (values, helpers) => {
      setError(null);
      try {
        const message = await changePassword(values);
        Toast.show({type: 'success', text1: message || 'Password updated'});
        navigation.goBack();
      } catch (err) {
        // A 422 lands under its own field; only what has no field shows below.
        const fields = apiFieldErrors(err);
        if (fields) {
          helpers.setErrors(fields);
          const other = Object.keys(fields).find(key => !(key in values));
          setError(other ? fields[other] : null);
        } else {
          setError(
            apiErrorMessage(
              err,
              "Couldn't change your password. Please try again.",
            ),
          );
        }
      }
    },
  });

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
      <AppHeader title="Change password" subtitle="For signing in to this app" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled">
          <Card>
            <View style={styles.cardBody}>
              <AppInput
                label="Current password"
                secure
                autoCapitalize="none"
                {...field('current_password')}
              />
            </View>
          </Card>

          <Card>
            <View style={styles.cardBody}>
              <AppInput
                label="New password"
                secure
                autoCapitalize="none"
                {...field('password')}
              />
              <PasswordChecklist value={formik.values.password} />
              <AppInput
                label="Confirm new password"
                secure
                autoCapitalize="none"
                {...field('password_confirmation')}
              />
            </View>
          </Card>

          <InfoNote>
            Use the new password the next time you sign in, on this phone or
            the web portal.
          </InfoNote>

          {!!error && <Text style={styles.error}>{error}</Text>}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <AppButton
          title="Update password"
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

export default ChangePasswordScreen;
