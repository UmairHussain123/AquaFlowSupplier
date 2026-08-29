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

import {Colors} from '../../Constant/Colors';
import Route from '../../Constant/NavigationStrings';
import AppButton from '../../Component/Common/AppButton';
import AppHeader from '../../Component/Common/AppHeader';
import AppInput from '../../Component/Common/AppInput';
import PasswordChecklist from '../../Component/Common/PasswordChecklist';
import {resetPasswordSchema} from '../../Formik/ForgetSchema';
import {resetPasswordRequest} from '../../Server/User';
import {apiErrorMessage} from '../../helper/helperFunction';

/** Set a new password with the emailed reset token. */
const ResetPassword: React.FC<{navigation: any; route: any}> = ({
  navigation,
  route,
}) => {
  const [error, setError] = useState<string | null>(null);

  const formik = useFormik({
    initialValues: {
      email: route?.params?.email ?? '',
      token: route?.params?.token ?? '',
      password: '',
      password_confirmation: '',
    },
    validationSchema: resetPasswordSchema,
    onSubmit: async values => {
      setError(null);
      try {
        const data = await resetPasswordRequest({
          email: values.email.trim(),
          token: values.token.trim(),
          password: values.password,
          password_confirmation: values.password_confirmation,
        });
        Toast.show({type: 'success', text1: data.message || 'Password updated'});
        navigation.replace(Route.Login);
      } catch (err) {
        // A bad or expired token comes back as a 422 whose message says so.
        setError(apiErrorMessage(err, 'Could not reset your password.'));
      }
    },
  });

  return (
    <View style={styles.screen}>
      <AppHeader title="Set a new password" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled">
          <AppInput
            label="Email"
            value={formik.values.email}
            onChangeText={formik.handleChange('email')}
            onBlur={formik.handleBlur('email')}
            keyboardType="email-address"
            autoCapitalize="none"
            error={formik.touched.email && formik.errors.email}
          />

          <AppInput
            label="Reset token"
            value={formik.values.token}
            onChangeText={formik.handleChange('token')}
            onBlur={formik.handleBlur('token')}
            autoCapitalize="none"
            mono
            error={formik.touched.token && formik.errors.token}
          />

          <AppInput
            label="New password"
            value={formik.values.password}
            onChangeText={formik.handleChange('password')}
            onBlur={formik.handleBlur('password')}
            secure
            autoCapitalize="none"
            error={formik.touched.password && formik.errors.password}
          />

          <PasswordChecklist value={formik.values.password} />

          <AppInput
            label="Confirm new password"
            value={formik.values.password_confirmation}
            onChangeText={formik.handleChange('password_confirmation')}
            onBlur={formik.handleBlur('password_confirmation')}
            secure
            autoCapitalize="none"
            error={
              formik.touched.password_confirmation &&
              formik.errors.password_confirmation
            }
          />

          {!!error && <Text style={styles.apiError}>{error}</Text>}

          <AppButton
            title="Update password"
            onPress={formik.handleSubmit as any}
            loading={formik.isSubmitting}
            style={styles.submit}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.surface},
  flex: {flex: 1},
  body: {padding: 20, gap: 14, paddingBottom: 40},
  apiError: {fontSize: 13, color: Colors.danger, fontWeight: '600'},
  submit: {height: 54},
});

export default ResetPassword;
