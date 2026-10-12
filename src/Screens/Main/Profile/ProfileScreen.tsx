import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {useDispatch, useSelector} from 'react-redux';
import Toast from 'react-native-toast-message';

import {Colors} from '../../../Constant/Colors';
import Route from '../../../Constant/NavigationStrings';
import AppButton from '../../../Component/Common/AppButton';
import AppHeader from '../../../Component/Common/AppHeader';
import Card from '../../../Component/Common/Card';
import InfoNote from '../../../Component/Common/InfoNote';
import KeyValueRow from '../../../Component/Common/KeyValueRow';
import ListRow from '../../../Component/Common/ListRow';
import Pill from '../../../Component/Common/Pill';
import ShopStatusPill from '../../../Component/Common/ShopStatusPill';
import StatusBadge from '../../../Component/Common/StatusBadge';
import {useActiveShopId} from '../../../hooks/useActiveShop';
import {roleLabel, useSupplierRoles} from '../../../hooks/useSupplierRoles';
import {selectUser, setUser} from '../../../Redux/slices/userSlice';
import {useSignOut} from '../../../hooks/useSignOut';
import {
  LOCALES,
  getProfile,
  type Profile,
} from '../../../Server/Account/AccountApi';
import {formatDateTime} from '../../../helper/dateHelper';
import {
  apiErrorMessage,
  initials,
  statusLabel,
} from '../../../helper/helperFunction';
import {formatPhoneDisplay} from '../../../helper/phoneHelper';

/**
 * The signed-in person's own account: who they are, what they can do, and
 * every shop they're linked to. Each role can edit their own details and
 * change their own password from here.
 *
 *   GET /supplier/profile
 */
const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const {signOut, signingOut} = useSignOut();
  const user = useSelector(selectUser);
  const activeShopId = useActiveShopId();
  const {isShopManager} = useSupplierRoles();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      try {
        const next = await getProfile();
        setProfile(next);
        setError(null);
      } catch (err) {
        const message = apiErrorMessage(err, 'Could not load your account.');
        setError(message);
        Toast.show({type: 'error', text1: message});
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Keep the signed-in identity (headers, greetings) in step with the server.
  useEffect(() => {
    if (!profile || !user) return;
    if (
      profile.name !== user.name ||
      profile.email !== user.email ||
      (profile.phone ?? null) !== (user.phone ?? null)
    ) {
      dispatch(
        setUser({
          ...user,
          name: profile.name,
          email: profile.email,
          phone: profile.phone,
        }),
      );
    }
  }, [profile, user, dispatch]);

  // Fall back to the account saved at sign-in while loading or if it failed.
  const name = profile?.name ?? user?.name;
  const email = profile?.email ?? user?.email;
  const phone = profile?.phone ?? user?.phone ?? null;
  const roles = profile?.roles?.length ? profile.roles : user?.roles ?? [];
  const supplier = profile?.supplier_profile ?? null;
  const shops = profile?.shops ?? [];
  const language =
    LOCALES.find(locale => locale.value === profile?.locale)?.label ?? 'English';

  return (
    <View style={styles.screen}>
      <AppHeader title="My account" subtitle="Your sign-in details and password" />

      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
        }>
        {!!error && (
          <InfoNote tone="warning">
            Couldn't refresh your account, so these are the details saved on
            this phone. Pull down to try again.
          </InfoNote>
        )}

        <Card>
          <View style={styles.identity}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials(name)}</Text>
            </View>
            <View style={styles.flex}>
              <Text style={styles.name}>{name ?? '—'}</Text>
              <Text style={styles.email}>{email ?? '—'}</Text>
            </View>
          </View>

          <View style={styles.roles}>
            {roles.map(role => (
              <Pill key={role} label={roleLabel(role)} tone="primary" uppercase />
            ))}
          </View>

          <View style={styles.lines}>
            <KeyValueRow label="Mobile" value={formatPhoneDisplay(phone)} />
            <KeyValueRow label="Language" value={profile ? language : '—'} />
            <KeyValueRow
              label="Last sign-in"
              value={profile ? formatDateTime(profile.last_login_at) : '—'}
            />
          </View>
        </Card>

        <Card flush>
          <ListRow
            title="Edit profile"
            subtitle="Name, email, mobile and language"
            onPress={() => navigation.navigate(Route.EditProfileScreen, {profile})}
          />
          <ListRow
            title="Change password"
            subtitle="Needs your current password"
            onPress={() => navigation.navigate(Route.ChangePasswordScreen)}
            last
          />
        </Card>

        {!!supplier && (
          <Card>
            <View style={styles.cardHead}>
              <Text style={[styles.cardTitle, styles.flex]}>
                {supplier.shop_public_name ?? supplier.legal_name ?? 'Supplier'}
              </Text>
              <StatusBadge status={supplier.status} />
            </View>
            <View style={styles.lines}>
              {!!supplier.legal_name && (
                <KeyValueRow label="Legal name" value={supplier.legal_name} />
              )}
              {!!supplier.owner_name && (
                <KeyValueRow label="Owner" value={supplier.owner_name} />
              )}
              {!!supplier.supplier_type && (
                <KeyValueRow
                  label="Supplier type"
                  value={statusLabel(supplier.supplier_type)}
                />
              )}
            </View>
          </Card>
        )}

        <Card>
          <Text style={styles.cardTitle}>
            {shops.length > 1 ? `Your shops · ${shops.length}` : 'Your shops'}
          </Text>
          {loading && !profile ? (
            <ActivityIndicator color={Colors.primary} style={styles.shopsLoader} />
          ) : !shops.length ? (
            <Text style={styles.muted}>
              {profile ? 'No shop linked yet.' : 'Pull down to load your shops.'}
            </Text>
          ) : (
            <View style={styles.shops}>
              {shops.map((shop, index) => (
                <View
                  key={shop.id}
                  style={[styles.shop, index > 0 && styles.shopDivider]}>
                  <View style={styles.flex}>
                    <View style={styles.shopNameRow}>
                      <Text style={styles.shopName} numberOfLines={1}>
                        {shop.public_name}
                      </Text>
                      {shop.id === activeShopId && shops.length > 1 && (
                        <Pill label="Current" tone="primary" />
                      )}
                    </View>
                    <Text style={styles.shopMeta}>
                      {[shop.branch_name, shop.city].filter(Boolean).join(' · ') ||
                        '—'}
                    </Text>
                  </View>
                  {shop.status === 'active' ? (
                    <ShopStatusPill
                      label={shop.is_open ? 'Open' : 'Closed'}
                      open={shop.is_open}
                    />
                  ) : (
                    <StatusBadge status={shop.status} />
                  )}
                </View>
              ))}
            </View>
          )}
        </Card>

        <InfoNote>
          {isShopManager
            ? 'Shop details — name, address, hours and contact numbers — are edited from the Shop tab.'
            : 'Shop details are managed by your shop owner or manager.'}
        </InfoNote>

        <AppButton
          title={signingOut ? 'Logging out…' : 'Log out'}
          variant="danger"
          loading={signingOut}
          disabled={signingOut}
          onPress={signOut}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.surface},
  flex: {flex: 1},
  body: {padding: 20, gap: 12, paddingBottom: 30},

  identity: {flexDirection: 'row', alignItems: 'center', gap: 13},
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {fontSize: 17, fontWeight: '800', color: Colors.primary},
  name: {fontSize: 16, fontWeight: '800', color: Colors.text},
  email: {fontSize: 12.5, color: Colors.textSecondary, marginTop: 2},
  roles: {flexDirection: 'row', gap: 7, flexWrap: 'wrap', marginTop: 12},

  cardHead: {flexDirection: 'row', alignItems: 'center', gap: 10},
  cardTitle: {fontSize: 14, fontWeight: '800', color: Colors.text},
  lines: {gap: 9, marginTop: 11},
  muted: {fontSize: 12.5, color: Colors.textMuted, marginTop: 8},

  shopsLoader: {marginTop: 12},
  shops: {marginTop: 4},
  shop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
  },
  shopDivider: {borderTopWidth: 1, borderTopColor: Colors.borderSoft2},
  shopNameRow: {flexDirection: 'row', alignItems: 'center', gap: 7},
  shopName: {flexShrink: 1, fontSize: 14, fontWeight: '800', color: Colors.text},
  shopMeta: {fontSize: 12, color: Colors.textSecondary, marginTop: 2},
});

export default ProfileScreen;
