import React, {useCallback, useState} from 'react';
import {
  Alert,
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
import ListRow from '../../../Component/Common/ListRow';
import Pill from '../../../Component/Common/Pill';
import ShopStatusPill from '../../../Component/Common/ShopStatusPill';
import {useActiveShopId} from '../../../hooks/useActiveShop';
import {setLoudOrderAlert} from '../../../Redux/slices/SettingSlice';
import {
  selectActiveShop,
  selectShops,
  setActiveShop,
  setShops,
  shopStatusLabel,
} from '../../../Redux/slices/shopSlice';
import {selectUser} from '../../../Redux/slices/userSlice';
import {logoutRequest} from '../../../Server/User';
import {listShops, shopLocationLabel} from '../../../Server/Shops/ShopsApi';
import {
  listBusinessHours,
  listHolidays,
  listServiceZones,
  weekFromApi,
  weekSummary,
  zonesSummary,
  type Holiday,
} from '../../../Server/ShopSettings/ShopSettingsApi';
import {getContainerLedger} from '../../../Server/Container/ContainerApi';
import {apiErrorMessage, formatMoney, initials, pluralize} from '../../../helper/helperFunction';

/**
 * SC1 — Shop.
 *
 * The hub for everything that isn't an order: shop identity, open/closed,
 * hours, delivery zones, the container ledger, compliance, support and sign
 * out. Each row carries a live summary so the supplier can see the state
 * without opening the screen.
 */
const ShopScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const shopId = useActiveShopId();
  const shop = useSelector(selectActiveShop);
  const shops = useSelector(selectShops);
  const user = useSelector(selectUser);
  const loudAlert = useSelector((state: any) => state.setting.loudOrderAlert);

  const [hoursLabel, setHoursLabel] = useState('—');
  const [zonesLabel, setZonesLabel] = useState('—');
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [ledgerLabel, setLedgerLabel] = useState('—');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!shopId) return;
      if (isRefresh) setRefreshing(true);

      // Each summary is independent — one failing shouldn't blank the others.
      const [hours, zones, holidayRows, ledger] = await Promise.allSettled([
        listBusinessHours(shopId),
        listServiceZones(shopId),
        listHolidays(shopId),
        getContainerLedger(shopId),
      ]);

      if (hours.status === 'fulfilled') {
        setHoursLabel(weekSummary(weekFromApi(hours.value)));
      }
      if (zones.status === 'fulfilled') {
        setZonesLabel(zonesSummary(zones.value));
      }
      if (holidayRows.status === 'fulfilled') {
        setHolidays(holidayRows.value);
      }
      if (ledger.status === 'fulfilled') {
        setLedgerLabel(
          `${pluralize(ledger.value.totalJars, 'jar')} on loan · ${formatMoney(
            ledger.value.totalDeposits,
          )} held`,
        );
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
    [dispatch, shopId],
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const signOut = () => {
    Alert.alert('Log out?', 'You will need your email and password to sign back in.', [
      {text: 'Stay signed in', style: 'cancel'},
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          try {
            await logoutRequest();
          } catch (error) {
            Toast.show({
              type: 'error',
              text1: apiErrorMessage(error, 'Signed out locally.'),
            });
          }
        },
      },
    ]);
  };

  const isOpen = !!shop?.is_open && shop?.status === 'active';

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Shop</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />
        }>
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
              <Text style={styles.shopMeta}>{shopLocationLabel(shop)}</Text>
              {shop?.status === 'active' ? (
                <Text style={styles.verified}>Verified · listed publicly</Text>
              ) : (
                <Text style={styles.suspended}>
                  {shopStatusLabel(shop)} · hidden from customers
                </Text>
              )}
            </View>
            {!!shop?.rating_avg && Number(shop.rating_avg) > 0 && (
              <Pill label={`${Number(shop.rating_avg).toFixed(1)} ★`} tone="primary" />
            )}
          </View>
        </Card>

        {shops.length > 1 && (
          <Card flush>
            {shops.map((row, index) => (
              <ListRow
                key={row.id}
                title={row.public_name}
                subtitle={`${row.area} · ${shopStatusLabel(row)}`}
                last={index === shops.length - 1}
                onPress={() => dispatch(setActiveShop(row.id))}
                right={
                  row.id === shopId ? (
                    <Pill label="Active" tone="primary" />
                  ) : undefined
                }
              />
            ))}
          </Card>
        )}

        <Card>
          <View style={styles.statusRow}>
            <Text style={styles.cardTitle}>Store status</Text>
            <ShopStatusPill label={shopStatusLabel(shop)} open={isOpen} />
          </View>
          <Text style={styles.helper}>
            Whether you're open right now follows your opening hours and holidays
            — set a holiday to close for a whole day without changing the week.
          </Text>
          <View style={styles.statusActions}>
            <TouchableOpacity
              style={[styles.softAction, styles.softActionPrimary]}
              onPress={() => navigation.navigate(Route.BusinessHoursScreen)}>
              <Text style={[styles.softActionText, styles.softActionPrimaryText]}>
                Edit hours
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.softAction}
              onPress={() => navigation.navigate(Route.HolidaysScreen)}>
              <Text style={styles.softActionText}>Holiday mode</Text>
            </TouchableOpacity>
          </View>
        </Card>

        <Card flush>
          <ListRow
            title="Hours & holidays"
            subtitle={
              holidays.length
                ? `${hoursLabel} · ${pluralize(holidays.length, 'holiday')}`
                : hoursLabel
            }
            onPress={() => navigation.navigate(Route.BusinessHoursScreen)}
          />
          <ListRow
            title="Service area & fees"
            subtitle={zonesLabel}
            onPress={() => navigation.navigate(Route.ServiceZonesScreen)}
          />
          <ListRow
            title="Container ledger"
            subtitle={ledgerLabel}
            onPress={() => navigation.navigate(Route.ContainerLedgerScreen)}
          />
          <ListRow
            title="Compliance"
            subtitle="Licences, lab report and what customers see"
            onPress={() => navigation.navigate(Route.ComplianceScreen)}
          />
          <ListRow
            title="Support & disputes"
            subtitle="Raise a ticket or a jar claim"
            onPress={() => navigation.navigate(Route.SupportScreen)}
            last
          />
        </Card>

        <Card flush>
          <ListRow
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
            title="Profile"
            subtitle={user?.email}
            onPress={() => navigation.navigate(Route.ProfileScreen)}
          />
          <ListRow title="Log out" onPress={signOut} danger last />
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 18,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    shadowColor: 'rgba(11,27,43,1)',
    shadowOpacity: 0.05,
    shadowRadius: 22,
    shadowOffset: {width: 0, height: 8},
    elevation: 3,
    zIndex: 2,
  },
  title: {
    fontSize: 25,
    fontWeight: '800',
    letterSpacing: -0.7,
    color: Colors.text,
  },
  body: {paddingHorizontal: 18, paddingTop: 16, paddingBottom: 30, gap: 11},

  identity: {flexDirection: 'row', alignItems: 'center', gap: 13},
  logo: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: Colors.white,
  },
  shopName: {fontSize: 15.5, fontWeight: '800', color: Colors.text},
  shopMeta: {fontSize: 12, color: Colors.textSecondary, marginTop: 2},
  verified: {fontSize: 12, color: Colors.success, fontWeight: '700', marginTop: 3},
  suspended: {fontSize: 12, color: Colors.warningText, fontWeight: '700', marginTop: 3},

  statusRow: {flexDirection: 'row', alignItems: 'center', gap: 12},
  cardTitle: {flex: 1, fontSize: 14.5, fontWeight: '800', color: Colors.text},
  helper: {fontSize: 12, color: Colors.textSecondary, lineHeight: 18, marginTop: 10},
  statusActions: {flexDirection: 'row', gap: 9, marginTop: 12},
  softAction: {
    flex: 1,
    backgroundColor: Colors.surface3,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  softActionPrimary: {backgroundColor: Colors.primaryTint},
  softActionText: {fontSize: 13.5, fontWeight: '800', color: Colors.slate},
  softActionPrimaryText: {color: Colors.primary},
});

export default ShopScreen;
