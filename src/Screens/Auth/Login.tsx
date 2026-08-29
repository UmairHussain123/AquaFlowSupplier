import React, {useState} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFormik} from 'formik';
import {useDispatch} from 'react-redux';
import Toast from 'react-native-toast-message';

import {Colors} from '../../Constant/Colors';
import Route from '../../Constant/NavigationStrings';
import BrandLogo from '../../Component/Icons/BrandLogo';
import AppButton from '../../Component/Common/AppButton';
import AppInput from '../../Component/Common/AppInput';
import {loginSchema} from '../../Formik/LoginSchema';
import {login} from '../../Redux/slices/userSlice';
import {setShops, shopsFailed} from '../../Redux/slices/shopSlice';
import {loginRequest} from '../../Server/User';
import {listShops} from '../../Server/Shops/ShopsApi';
import {apiErrorMessage} from '../../helper/helperFunction';
import {PlusIcon} from '../../Component/Icons/TabIcons';

/**
 * SA1 — Login.
 *
 * The design sketches an SMS-code sign-in, but the Aquago Supplier API only
 * exposes `POST /supplier/login` with an email and password (the same account
 * the web portal uses), so the fields are email + password inside the design's
 * layout. Everything else — dark header, apply card, staff note, ops footer —
 * is as drawn.
 */
const Login: React.FC<{navigation: any}> = ({navigation}) => {
  const dispatch = useDispatch();
  const [error, setError] = useState<string | null>(null);

  const formik = useFormik({
    initialValues: {email: '', password: ''},
    validationSchema: loginSchema,
    onSubmit: async values => {
      setError(null);
      try {
        const data = await loginRequest({
          email: values.email.trim(),
          password: values.password,
        });

        dispatch(login({user: data.user, token: data.token}));

        // Resolve the shop before leaving the screen — every shop-scoped screen
        // needs shop_id, and the login response doesn't carry it.
        try {
          dispatch(setShops(await listShops()));
        } catch {
          dispatch(shopsFailed());
        }

        Toast.show({type: 'success', text1: `Welcome back, ${data.user.name}`});
        navigation.replace(Route.Main);
      } catch (err) {
        setError(apiErrorMessage(err, 'Could not sign you in. Please try again.'));
      }
    },
  });

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <View style={styles.brandRow}>
          <BrandLogo size={30} />
          <Text style={styles.brand}>
            Aqua Flow <Text style={styles.brandSub}>Supplier</Text>
          </Text>
        </View>
        <Text style={styles.headline}>Run your water shop from your phone</Text>
        <Text style={styles.subhead}>
          Orders, stock, jar returns and payouts in one place.
        </Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled">
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

          <AppInput
            label="Password"
            value={formik.values.password}
            onChangeText={formik.handleChange('password')}
            onBlur={formik.handleBlur('password')}
            placeholder="Your password"
            secure
            autoCapitalize="none"
            error={formik.touched.password && formik.errors.password}
          />

          {!!error && <Text style={styles.apiError}>{error}</Text>}

          <AppButton
            title="Sign in"
            onPress={formik.handleSubmit as any}
            loading={formik.isSubmitting}
            style={styles.signIn}
          />

          <TouchableOpacity
            onPress={() => navigation.navigate(Route.ForgetPassword)}
            style={styles.forgotWrap}>
            <Text style={styles.forgot}>Forgot your password?</Text>
          </TouchableOpacity>

          <View style={styles.rule} />

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => navigation.navigate(Route.ApplyScreen)}
            style={styles.applyCard}>
            <View style={styles.applyGlyph}>
              <PlusIcon color={Colors.primary} size={20} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.applyTitle}>Apply to become a supplier</Text>
              <Text style={styles.applyBody}>
                Reviewed by Aqua Flow ops in 2–3 working days.
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.staffNote}>
            <Text style={styles.staffText}>
              Delivery staff use the account their owner added under Staff — they
              only see assigned orders.
            </Text>
          </View>

          <Text style={styles.footer}>
            Shop suspended or documents expired?{' '}
            <Text
              style={styles.footerLink}
              onPress={() => navigation.navigate(Route.ApplicationStatusScreen)}>
              Check application status
            </Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.white},
  flex: {flex: 1},

  header: {
    backgroundColor: Colors.primaryDark,
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 26,
  },
  brandRow: {flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18},
  brand: {fontWeight: '800', fontSize: 17, color: Colors.white},
  brandSub: {color: Colors.textOnDark2, fontWeight: '700'},
  headline: {
    fontSize: 25,
    fontWeight: '800',
    letterSpacing: -0.6,
    lineHeight: 30,
    color: Colors.white,
  },
  subhead: {
    fontSize: 13.5,
    color: Colors.textOnDark,
    marginTop: 8,
    lineHeight: 20,
  },

  body: {padding: 22, gap: 14, paddingBottom: 40},
  signIn: {height: 54, borderRadius: 14, marginTop: 2},
  apiError: {
    fontSize: 13,
    color: Colors.danger,
    fontWeight: '600',
    lineHeight: 19,
  },
  forgotWrap: {alignSelf: 'center'},
  forgot: {fontSize: 13, fontWeight: '800', color: Colors.primary},

  rule: {height: 1, backgroundColor: Colors.borderSoft, marginVertical: 6},

  applyCard: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.borderDashed,
    borderRadius: 15,
    padding: 16,
    flexDirection: 'row',
    gap: 13,
    alignItems: 'center',
  },
  applyGlyph: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyTitle: {fontSize: 15, fontWeight: '800', color: Colors.text},
  applyBody: {
    fontSize: 12.5,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginTop: 2,
  },

  staffNote: {backgroundColor: Colors.surface, borderRadius: 13, padding: 14},
  staffText: {fontSize: 12.5, color: Colors.textSecondary, lineHeight: 19},

  footer: {
    marginTop: 8,
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 19,
  },
  footerLink: {color: Colors.primary, fontWeight: '800'},
});

export default Login;
