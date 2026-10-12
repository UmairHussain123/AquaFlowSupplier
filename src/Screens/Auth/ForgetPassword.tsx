import React, {useEffect, useState} from 'react';
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
import InfoNote from '../../Component/Common/InfoNote';
import {forgetSchema} from '../../Formik/ForgetSchema';
import {forgotPasswordRequest} from '../../Server/User';
import {apiErrorMessage} from '../../helper/helperFunction';

/** The last request that went through — while set, the screen reads "Check your email". */
type Sent = {email: string; message: string; token?: string};

/**
 * Request password-reset instructions.
 *
 * After a request the screen turns into "Check your email", with a resend and
 * the way on to the reset form. Outside production the API also returns
 * `reset_token`, which is handed to that form so the supplier doesn't have to
 * wait for an inbox (a queue worker has to be running for real mail to go
 * out).
 */
const ForgetPassword: React.FC<{navigation: any; route: any}> = ({
  navigation,
  route,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<Sent | null>(null);
  const [resending, setResending] = useState(false);

  const request = async (email: string) => {
    const data = await forgotPasswordRequest(email);
    setSent({
      email,
      message:
        data?.message ||
        `Password reset instructions have been sent to ${email}.`,
      token: data?.reset_token || undefined,
    });
  };

  const formik = useFormik({
    initialValues: {email: route?.params?.email ?? ''},
    validationSchema: forgetSchema,
    onSubmit: async values => {
      setError(null);
      try {
        await request(values.email.trim());
      } catch (err) {
        setError(apiErrorMessage(err, 'Could not send the reset email.'));
      }
    },
  });

  // "Code expired? Request a new one" on the reset form pops back here with
  // the email — start over from the form, pre-filled.
  useEffect(() => {
    const email = route?.params?.email;
    if (typeof email !== 'string') return;
    setSent(null);
    setError(null);
    formik.setFieldValue('email', email);
    // Only a new set of params should reset the screen, not every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route?.params]);

  const resend = async () => {
    if (!sent) return;
    setError(null);
    setResending(true);
    try {
      await request(sent.email);
      Toast.show({type: 'success', text1: 'Reset email sent again'});
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not resend the reset email.'));
    } finally {
      setResending(false);
    }
  };

  const startOver = () => {
    setSent(null);
    setError(null);
  };

  return (
    <View style={styles.screen}>
      <AppHeader title="Forgot password" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled">
          {sent ? (
            <>
              <View style={styles.sentHead}>
                <Text style={styles.title}>Check your email</Text>
                <Text style={styles.lead}>{sent.message}</Text>
              </View>

              {!!sent.token && (
                <InfoNote tone="warning">
                  Staging only — the API returned a reset code directly, so you
                  can continue without waiting for the email.
                </InfoNote>
              )}

              {!!error && <Text style={styles.apiError}>{error}</Text>}

              <AppButton
                title="Enter reset code"
                onPress={() =>
                  navigation.navigate(Route.ResetPassword, {
                    email: sent.email,
                    token: sent.token,
                  })
                }
                style={styles.submit}
              />

              <AppButton
                title="Resend email"
                variant="secondary"
                onPress={resend}
                loading={resending}
              />

              <Text style={styles.footer}>
                Wrong address?{' '}
                <Text style={styles.link} onPress={startOver}>
                  Use a different email
                </Text>
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.lead}>
                Enter the email on your supplier account. We'll send a reset
                code you can use on the next screen.
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

              <AppButton
                title="Send reset instructions"
                onPress={formik.handleSubmit as any}
                loading={formik.isSubmitting}
                style={styles.submit}
              />

              <AppButton
                title="I have a reset code"
                variant="secondary"
                onPress={() =>
                  navigation.navigate(Route.ResetPassword, {
                    email: formik.values.email.trim(),
                  })
                }
              />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.surface},
  flex: {flex: 1},
  body: {padding: 20, gap: 14, paddingBottom: 40},
  sentHead: {gap: 6},
  title: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: Colors.text,
  },
  lead: {fontSize: 13, color: Colors.textSecondary, lineHeight: 20},
  apiError: {fontSize: 13, color: Colors.danger, fontWeight: '600'},
  submit: {height: 54},
  footer: {
    marginTop: 4,
    fontSize: 12.5,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 19,
  },
  link: {color: Colors.primary, fontWeight: '800'},
});

export default ForgetPassword;
