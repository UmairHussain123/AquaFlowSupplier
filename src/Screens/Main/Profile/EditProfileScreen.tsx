import React, {useCallback, useEffect, useState} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useFormik} from 'formik';
import {useDispatch, useSelector} from 'react-redux';
import Toast from 'react-native-toast-message';

import {Colors} from '../../../Constant/Colors';
import AppButton from '../../../Component/Common/AppButton';
import AppHeader from '../../../Component/Common/AppHeader';
import AppInput from '../../../Component/Common/AppInput';
import Card from '../../../Component/Common/Card';
import EmptyState from '../../../Component/Common/EmptyState';
import InfoNote from '../../../Component/Common/InfoNote';
import ScreenLoader from '../../../Component/Common/ScreenLoader';
import SelectField from '../../../Component/Common/SelectField';
import {apiFieldErrors, profileSchema} from '../../../Formik/AccountSchema';
import {selectUser, setUser} from '../../../Redux/slices/userSlice';
import {
  LOCALES,
  getProfile,
  updateProfile,
  type Locale,
  type Profile,
} from '../../../Server/Account/AccountApi';
import {apiErrorMessage} from '../../../helper/helperFunction';
import {formatPakistaniPhone} from '../../../helper/phoneHelper';

type Props = {navigation: any; route: any};

/**
 * Edit your own name, email, mobile and language (params: `profile?`). Opened
 * without a profile — or before the account screen finished loading — it
 * fetches one first.
 *
 *   PATCH /supplier/profile
 */
const EditProfileScreen: React.FC<Props> = ({navigation, route}) => {
  const [profile, setProfile] = useState<Profile | null>(
    route?.params?.profile ?? null,
  );
  const [loading, setLoading] = useState(!profile);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setProfile(await getProfile());
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not load your account.'));
    } finally {
      setLoading(false);
    }
  }, []);

  const hasProfile = !!profile;
  useEffect(() => {
    if (!hasProfile) load();
  }, [hasProfile, load]);

  if (profile) return <ProfileForm profile={profile} navigation={navigation} />;

  return (
    <View style={styles.screen}>
      <AppHeader title="Edit profile" />
      {loading ? (
        <ScreenLoader message="Loading your account…" />
      ) : (
        <EmptyState
          title="Couldn't load your account"
          message={error ?? undefined}
          actionLabel="Try again"
          onAction={load}
        />
      )}
    </View>
  );
};

/** Ports the portal's "Your details" form on the account page. */
const ProfileForm: React.FC<{profile: Profile; navigation: any}> = ({
  profile,
  navigation,
}) => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const [error, setError] = useState<string | null>(null);

  const formik = useFormik({
    initialValues: {
      name: profile.name ?? '',
      email: profile.email ?? '',
      phone: profile.phone ? formatPakistaniPhone(profile.phone) : '',
      locale: (profile.locale === 'ur' ? 'ur' : 'en') as Locale,
    },
    validationSchema: profileSchema,
    onSubmit: async (values, helpers) => {
      setError(null);
      const phone = values.phone.trim();

      try {
        const saved = await updateProfile({
          name: values.name.trim(),
          email: values.email.trim(),
          ...(phone ? {phone} : {}),
          locale: values.locale,
        });

        // Keep the signed-in identity (headers, greetings) in step with what was saved.
        dispatch(
          setUser(
            user
              ? {...user, name: saved.name, email: saved.email, phone: saved.phone}
              : {
                  id: saved.id,
                  name: saved.name,
                  email: saved.email,
                  roles: saved.roles ?? [],
                  phone: saved.phone,
                },
          ),
        );
        Toast.show({type: 'success', text1: 'Account updated'});
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
            apiErrorMessage(err, "Couldn't save your details. Please try again."),
          );
        }
      }
    },
  });

  const fieldError = (name: string) =>
    (formik.touched as any)[name] && (formik.errors as any)[name];

  const emailChanged = formik.values.email.trim() !== profile.email;

  return (
    <View style={styles.screen}>
      <AppHeader title="Edit profile" subtitle="Your details" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled">
          <Card>
            <View style={styles.cardBody}>
              <AppInput
                label="Full name"
                autoCapitalize="words"
                value={formik.values.name}
                onChangeText={formik.handleChange('name')}
                onBlur={formik.handleBlur('name')}
                error={fieldError('name')}
              />

              <AppInput
                label="Email (your login)"
                keyboardType="email-address"
                autoCapitalize="none"
                value={formik.values.email}
                onChangeText={formik.handleChange('email')}
                onBlur={formik.handleBlur('email')}
                error={fieldError('email')}
              />
              {emailChanged && (
                <InfoNote tone="warning">
                  This is what you sign in with — use the new address next time.
                  It will need re-verifying.
                </InfoNote>
              )}

              <AppInput
                label="Mobile"
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

              <SelectField
                label="Language"
                value={formik.values.locale}
                options={LOCALES}
                onChange={value => formik.setFieldValue('locale', value)}
                error={fieldError('locale')}
              />
            </View>
          </Card>

          {!!error && <Text style={styles.error}>{error}</Text>}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <AppButton
          title="Save details"
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

export default EditProfileScreen;
