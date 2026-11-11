import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {useDispatch, useSelector} from 'react-redux';
import LinearGradient from 'react-native-linear-gradient';
import Toast from 'react-native-toast-message';

import {Colors} from '../../../Constant/Colors';
import Route from '../../../Constant/NavigationStrings';
import AppSwitch from '../../../Component/Common/AppSwitch';
import Card from '../../../Component/Common/Card';
import InfoNote from '../../../Component/Common/InfoNote';
import ListRow from '../../../Component/Common/ListRow';
import ChipGroup from '../../../Component/Common/ChipGroup';
import ShopStatusPill from '../../../Component/Common/ShopStatusPill';
import StatusBanners from '../../../Component/Common/StatusBanners';
import {PlusIcon} from '../../../Component/Icons/TabIcons';
import {useActiveShopId} from '../../../hooks/useActiveShop';
import {
  ROLE_MANAGER,
  ROLE_OWNER,
  ROLE_RIDER,
  roleLabel,
  useSupplierRoles,
} from '../../../hooks/useSupplierRoles';
import {useSignOut} from '../../../hooks/useSignOut';
import {useUnreadNotifications} from '../../../hooks/useUnreadNotifications';
import {setLoudOrderAlert} from '../../../Redux/slices/SettingSlice';
import {
  selectActiveShop,
  selectShops,
  setActiveShop,
  setShops,
  shopStatusLabel,
  upsertShop,
} from '../../../Redux/slices/shopSlice';
import {selectUser} from '../../../Redux/slices/userSlice';
import {
  capacityLabel,
  listShops,
  setShopOpenState,
  shopLocationLabel,
} from '../../../Server/Shops/ShopsApi';
import {
  listBusinessHours,
  listHolidays,
  listServiceZones,
  weekFromApi,
  weekSummary,
  zonesSummary,
  type Holiday,
} from '../../../Server/ShopSettings/ShopSettingsApi';
import {getContainerSummary} from '../../../Server/Container/ContainerTransactionsApi';
import {
  apiErrorMessage,
  formatMoney,
  initials,
  pluralize,
} from '../../../helper/helperFunction';

/**
 * SC1 — Shop.
 *
 * The hub for everything that isn't an order: shop identity, open/closed,
 * hours, delivery zones, jar deposits, customers, staff, compliance, support
 * and sign out. Each row carries a live summary so the supplier can see the
 * state without opening the screen.
 *
 * What's offered follows the role, as on the web sidebar: managers run hours
 * and holidays but see the shop details, zones and the pause switch read-only
 * (owner-only edits); a rider gets no shop settings at all.
 */
const ShopScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const shopId = useActiveShopId();
  const shop = useSelector(selectActiveShop);
  const shops = useSelector(selectShops);
  const user = useSelector(selectUser);
  const loudAlert = useSelector((state: any) => state.setting.loudOrderAlert);
  const {isOwner, isShopManager, isRiderOnly} = useSupplierRoles();
  const {count: unread} = useUnreadNotifications();
  const {signOut, signingOut} = useSignOut();

  const [hoursLabel, setHoursLabel] = useState('—');
  const [zonesLabel, setZonesLabel] = useState('—');
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [jarsLabel, setJarsLabel] = useState('Jars out with customers');
  const [refreshing, setRefreshing] = useState(false);
  const [togglingOpen, setTogglingOpen] = useState(false);

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);

      // Shop settings and jar deposits are shop management — a rider would
      // just get a 403 for each, so they aren't asked for.
      if (shopId && isShopManager) {
        // Each summary is independent — one failing shouldn't blank the others.
        const [hours, zones, holidayRows, jars] = await Promise.allSettled([
          listBusinessHours(shopId),
          listServiceZones(shopId),
          listHolidays(shopId),
          getContainerSummary(shopId),
        ]);

        if (hours.status === 'fulfilled') {
          setHoursLabel(weekSummary(weekFromApi(hours.value)));
        }
        if (zones.status === 'fulfilled') {
          setZonesLabel(zonesSummary(zones.value));
        }
        if (holidayRows.status === 'fulfilled') {
          setHolidays(holidayRows.value ?? []);
        }
        if (jars.status === 'fulfilled') {
          const {outstandingJars, depositHeld, pendingCount} = jars.value;
          setJarsLabel(
            pendingCount
              ? `${pluralize(outstandingJars, 'jar')} out · ${formatMoney(
                  depositHeld,
                )} held · ${pendingCount} to reconcile`
              : 'Nothing waiting to be reconciled',
          );
        }
      }

      if (isRefresh) {
        try {
          dispatch(setShops(await listShops()));
        } catch {
          /* the interceptor handles auth failures */
        }
        setRefreshing(false);
      }
    },
    [dispatch, isShopManager, shopId],
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  /**
   * Pause/resume the shop. `status` is admin-controlled, so a suspended shop
   * can't be reopened from here — only `is_open` is ours to set.
   */
  const toggleOpen = async (next: boolean) => {
    if (!shopId || togglingOpen) return;
    setTogglingOpen(true);
    try {
      dispatch(upsertShop(await setShopOpenState(shopId, next)));
      Toast.show({
        type: 'success',
        text1: next ? 'Now accepting orders' : 'Paused — no new orders',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: apiErrorMessage(error, 'Could not change your store status.'),
      });
    } finally {
      setTogglingOpen(false);
    }
  };

  const isOpen = !!shop?.is_open && shop?.status === 'active';
  const suspended = !!shop && shop.status === 'suspended';
  const pausedByAquaFlow = !!shop && shop.status === 'paused';
  const role = isOwner
    ? roleLabel(ROLE_OWNER)
    : isShopManager
    ? roleLabel(ROLE_MANAGER)
    : isRiderOnly
    ? roleLabel(ROLE_RIDER)
    : null;

  /** Everything else the shop runs, in web-sidebar order, filtered by role. */
  const menu = [
    {
      route: Route.CustomersScreen,
      title: 'Customers',
      subtitle: 'Your customer book',
      visible: isShopManager,
    },
    {
      route: Route.ContainerLedgerScreen,
      title: 'Jar deposits',
      subtitle: jarsLabel,
      visible: isShopManager,
    },
    {
      route: Route.PaymentsScreen,
      title: 'Payments',
      subtitle: 'Money recorded against your orders',
      visible: isShopManager,
    },
    {
      route: Route.DisputesScreen,
      title: 'Disputes',
      subtitle: 'Jar and deposit claims with ops',
      visible: isShopManager,
    },
    {
      route: Route.StaffScreen,
      title: 'Staff',
      subtitle: 'Managers and riders on your team',
      visible: isOwner,
    },
    {
      route: Route.PayoutAccountsScreen,
      title: 'Payout accounts',
      subtitle: 'Where your settlements are paid',
      visible: isOwner,
    },
    {
      route: Route.ComplianceScreen,
      title: 'Compliance',
      subtitle: 'Listing status and documents on file',
      visible: true,
    },
    {
      route: Route.SupportScreen,
      title: 'Support',
      subtitle: 'Raise a ticket or follow one up',
      visible: true,
    },
    {
      route: Route.NotificationScreen,
      title: 'Notifications',
      subtitle: unread
        ? `${pluralize(unread, 'unread notification')}`
        : 'Order updates and account notices',
      visible: true,
    },
  ].filter(item => item.visible);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Shop</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
          />
        }>
        <StatusBanners />

        {/* One card for who/where/open — identity, the shop switcher and the
            accepting-orders switch used to be three. */}
        <Card>
          <View style={styles.identity}>
            <LinearGradient
              colors={[Colors.gradFrom, Colors.gradTo]}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.logo}>
              <Text style={styles.logoText}>
                {initials(shop?.public_name ?? user?.name)}
              </Text>
            </LinearGradient>
            <View style={styles.flex}>
              <Text style={styles.shopName} numberOfLines={1}>
                {shop?.public_name ?? user?.name ?? 'Your shop'}
              </Text>
              <Text style={styles.shopMeta} numberOfLines={1}>
                {shopLocationLabel(shop)}
                {!!shop?.rating_avg && Number(shop.rating_avg) > 0
                  ? ` · ${Number(shop.rating_avg).toFixed(1)} ★`
                  : ''}
              </Text>
              {shop?.status === 'active' ? (
                <Text style={styles.verified}>Verified · listed publicly</Text>
              ) : (
                <Text style={styles.suspended}>
                  {shopStatusLabel(shop)} · hidden from customers
                </Text>
              )}
            </View>
            <ShopStatusPill label={shopStatusLabel(shop)} open={isOpen} />
          </View>

          {shops.length > 1 && (
            <View style={styles.switcher}>
              <Text style={styles.sectionLabel}>Switch shop</Text>
              <ChipGroup
                required
                wrap
                value={shopId}
                options={shops.map(row => ({
                  value: row.id,
                  label: row.branch_name || row.area || row.public_name,
                }))}
                onChange={next => {
                  const row = shops.find(s => s.id === next);
                  if (!row || row.id === shopId) return;
                  // The tab navigator remounts on this and lands on Home.
                  dispatch(setActiveShop(row.id));
                  Toast.show({
                    type: 'success',
                    text1: `Switched to ${row.public_name}`,
                  });
                }}
              />
            </View>
          )}

          {isOwner && (
            <TouchableOpacity
              style={styles.addShop}
              onPress={() => navigation.navigate(Route.CreateShopScreen)}>
              <PlusIcon color={Colors.primary} size={14} />
              <Text style={styles.addShopText}>Add shop</Text>
            </TouchableOpacity>
          )}

          {isShopManager && (
            <View style={styles.toggleRow}>
              <View style={styles.flex}>
                <Text style={styles.toggleLabel}>Accepting orders</Text>
                <Text style={styles.helper}>
                  {suspended
                    ? 'On hold with Aqua Flow — support can lift it.'
                    : pausedByAquaFlow
                    ? 'Paused by Aqua Flow until they resume it.'
                    : isOwner
                    ? 'Off stops new orders. Hours and holidays still apply.'
                    : 'Only the owner can pause or reopen the shop.'}
                </Text>
              </View>
              <AppSwitch
                value={!!shop?.is_open}
                disabled={!isOwner || suspended || togglingOpen}
                onValueChange={toggleOpen}
              />
            </View>
          )}
        </Card>

        {isShopManager && !isOwner && (
          <InfoNote>
            You manage hours and holidays. Shop details and delivery zones are
            view-only — only the owner can change them.
          </InfoNote>
        )}

        {isShopManager && (
          <>
            <Text style={styles.sectionLabel}>Shop setup</Text>
            <Card flush>
              <ListRow
                dense
                title="Shop details"
                subtitle={`${shop?.address_line ?? '—'} · ${capacityLabel(shop)}`}
                onPress={() => navigation.navigate(Route.ShopDetailsScreen)}
              />
              <ListRow
                dense
                title="Hours & holidays"
                subtitle={
                  holidays.length
                    ? `${hoursLabel} · ${pluralize(holidays.length, 'holiday')}`
                    : hoursLabel
                }
                onPress={() => navigation.navigate(Route.BusinessHoursScreen)}
              />
              <ListRow
                dense
                title="Service area & fees"
                subtitle={zonesLabel}
                onPress={() => navigation.navigate(Route.ServiceZonesScreen)}
                last
              />
            </Card>
          </>
        )}

        <Text style={styles.sectionLabel}>Business</Text>
        <Card flush>
          {menu.map((item, index) => (
            <ListRow
              dense
              key={item.route}
              title={item.title}
              subtitle={item.subtitle}
              onPress={() => navigation.navigate(item.route)}
              last={index === menu.length - 1}
            />
          ))}
        </Card>

        <Text style={styles.sectionLabel}>App and account</Text>
        <Card flush>
          <ListRow
            dense
            title="Loud alert for new orders"
            subtitle="Ring even when the phone is on silent"
            right={
              <AppSwitch
                value={loudAlert}
                onValueChange={value => dispatch(setLoudOrderAlert(value))}
              />
            }
          />
          <ListRow
            dense
            title="My account"
            subtitle={[user?.email, role].filter(Boolean).join(' · ')}
            onPress={() => navigation.navigate(Route.ProfileScreen)}
          />
          <ListRow
            dense
            title={signingOut ? 'Logging out…' : 'Log out'}
            onPress={signingOut ? undefined : signOut}
            right={
              signingOut ? (
                <ActivityIndicator size="small" color={Colors.danger} />
              ) : undefined
            }
            danger
            last
          />
        </Card>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.surface},
  flex: {flex: 1},
  header: {
    backgroundColor: Colors.white,
    paddingHorizontal: 18,
    paddingTop: 5,
    paddingBottom: 10,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    shadowColor: 'rgba(11,27,43,1)',
    shadowOpacity: 0.05,
    shadowRadius: 18,
    shadowOffset: {width: 0, height: 6},
    elevation: 3,
    zIndex: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.6,
    color: Colors.text,
  },
  body: {paddingHorizontal: 14, paddingTop: 11, paddingBottom: 20, gap: 7},
  sectionLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: Colors.textMuted,
    marginTop: 4,
    marginLeft: 3,
  },

  identity: {flexDirection: 'row', alignItems: 'center', gap: 10},
  logo: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: Colors.white,
  },
  shopName: {fontSize: 14, fontWeight: '800', color: Colors.text},
  shopMeta: {fontSize: 11.5, color: Colors.textSecondary, marginTop: 1},
  verified: {
    fontSize: 11,
    color: Colors.success,
    fontWeight: '700',
    marginTop: 2,
  },
  suspended: {
    fontSize: 11,
    color: Colors.warningText,
    fontWeight: '700',
    marginTop: 2,
  },

  switcher: {
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSoft,
  },
  addShop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSoft,
  },
  addShopText: {fontSize: 12.5, fontWeight: '800', color: Colors.primary},
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSoft,
  },
  toggleLabel: {fontSize: 13.5, fontWeight: '800', color: Colors.text},
  helper: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
    marginTop: 2,
  },
});

export default ShopScreen;
