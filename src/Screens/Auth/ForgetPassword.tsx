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

import {Colors} from '../../Constant/Colors';
import Route from '../../Constant/NavigationStrings';
import AppButton from '../../Component/Common/AppButton';
import AppHeader from '../../Component/Common/AppHeader';
import AppInput from '../../Component/Common/AppInput';
import InfoNote from '../../Component/Common/InfoNote';
import {forgetSchema} from '../../Formik/ForgetSchema';
import {forgotPasswordRequest} from '../../Server/User';
import {apiErrorMessage} from '../../helper/helperFunction';

/**
 * Request password-reset instructions.
 *
 * Outside production the API also returns `reset_token`, so the screen can hand
 * the supplier straight to the reset form instead of waiting for an inbox (a
 * queue worker has to be running for real mail to go out).
 */
const ForgetPassword: React.FC<{navigation: any}> = ({navigation}) => {
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  const formik = useFormik({
    initialValues: {email: ''},
    validationSchema: forgetSchema,
    onSubmit: async values => {
      setError(null);
      const email = values.email.trim();

      try {
        const data = await forgotPasswordRequest(email);
        setSent(data.message);

        if (data.reset_token) {
          navigation.navigate(Route.ResetPassword, {
            email,
            token: data.reset_token,
          });
        }
      } catch (err) {
        setError(apiErrorMessage(err, 'Could not send the reset email.'));
      }
    },
  });

  return (
    <View style={styles.screen}>
      <AppHeader title="Forgot password" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled">
          <Text style={styles.lead}>
            Enter the email on your supplier account. We'll send a reset token
            you can use on the next screen.
          </Text>

          <AppInput
            label="Registered email"
            value={formik.values.email}
            onChangeText={formik.handleChange('email')}
            onBlur={formik.handleBlur('email')}
            placeholder="you@shop.com"
            keyboardType="email-address"
            autoCapitalize="none"
            error={formik.touched.email && formik.errors.email}
          />

          {!!error && <Text style={styles.apiError}>{error}</Text>}
          {!!sent && <InfoNote tone="success">{sent}</InfoNote>}

          <AppButton
            title="Send reset instructions"
            onPress={formik.handleSubmit as any}
            loading={formik.isSubmitting}
            style={styles.submit}
          />

          <AppButton
            title="I already have a token"
            variant="secondary"
            onPress={() =>
              navigation.navigate(Route.ResetPassword, {
                email: formik.values.email.trim(),
              })
            }
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.surface},
  flex: {flex: 1},
  body: {padding: 20, gap: 14},
  lead: {fontSize: 13, color: Colors.textSecondary, lineHeight: 20},
  apiError: {fontSize: 13, color: Colors.danger, fontWeight: '600'},
  submit: {height: 54},
});

export default ForgetPassword;
