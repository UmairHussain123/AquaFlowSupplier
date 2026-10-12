/* eslint-disable react/no-unstable-nested-components */
import React, {useMemo} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import LinearGradient from 'react-native-linear-gradient';

import Route from '../Constant/NavigationStrings';
import {Colors} from '../Constant/Colors';
import {
  CatalogScreen,
  Dashboard,
  MoneyScreen,
  OrderScreen,
  ShopScreen,
} from './index';
import {
  CatalogIcon,
  HomeIcon,
  MoneyIcon,
  OrdersIcon,
  ShopIcon,
} from '../Component/Icons/TabIcons';
import {useSupplierRoles, type SupplierRoles} from '../hooks/useSupplierRoles';
import {useActiveShopId} from '../hooks/useActiveShop';

const Tab = createBottomTabNavigator();

/**
 * The five tabs from SB1: Home · Orders · Catalog · Money · Shop — each shown
 * only to the roles the web sidebar shows it to, so nobody lands on a tab that
 * would just answer 403.
 */
type TabDef = {
  name: string;
  component: React.ComponentType<any>;
  label: string;
  Icon: React.FC<{size?: number; color: string}>;
  /** Omit to show the tab to every role. */
  visibleTo?: (roles: SupplierRoles) => boolean;
};

const TABS: TabDef[] = [
  {
    name: Route.DashBoardScreen,
    component: Dashboard,
    label: 'Home',
    Icon: HomeIcon,
  },
  {
    name: Route.OrderScreen,
    component: OrderScreen,
    label: 'Orders',
    Icon: OrdersIcon,
  },
  {
    name: Route.CatalogScreen,
    component: CatalogScreen,
    label: 'Catalog',
    Icon: CatalogIcon,
    // Products are shop management — riders don't get them.
    visibleTo: roles => roles.isShopManager,
  },
  {
    name: Route.MoneyScreen,
    component: MoneyScreen,
    label: 'Money',
    Icon: MoneyIcon,
    // Earnings and payouts are the owner's.
    visibleTo: roles => roles.isOwner,
  },
  {
    name: Route.ShopScreen,
    component: ShopScreen,
    label: 'Shop',
    Icon: ShopIcon,
  },
];

/**
 * v2 sits every tab icon in a rounded tile — filled with the teal→blue ramp
 * when the tab is focused, a soft blue-grey when it isn't.
 */
const TabTile: React.FC<{focused: boolean; Icon: TabDef['Icon']}> = ({
  focused,
  Icon,
}) =>
  focused ? (
    <LinearGradient
      colors={[Colors.gradFrom, Colors.gradTo]}
      start={{x: 0, y: 0}}
      end={{x: 1, y: 1}}
      style={styles.tile}>
      <Icon color={Colors.white} size={19} />
    </LinearGradient>
  ) : (
    <View style={[styles.tile, styles.tileIdle]}>
      <Icon color={Colors.textMuted} size={19} />
    </View>
  );

/**
 * The tab list is re-derived whenever the roles change. If the focused tab is
 * dropped, the tab router moves focus to the most recently visited tab that
 * survives (Home at worst), so nothing is left pointing at a missing screen.
 *
 * Keyed by the active shop: switching shops remounts every tab, so no screen
 * keeps showing the old shop's rows while the new shop's load is in flight.
 * The remount lands on Home.
 */
const TabNavigator: React.FC = () => {
  const roles = useSupplierRoles();
  const shopId = useActiveShopId();
  const tabs = useMemo(
    () => TABS.filter(tab => !tab.visibleTo || tab.visibleTo(roles)),
    [roles],
  );

  return (
    <Tab.Navigator
      key={shopId ?? 'no-shop'}
      initialRouteName={Route.DashBoardScreen}
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.bar,
        tabBarItemStyle: styles.item,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
      }}>
      {tabs.map(({name, component, label, Icon}) => (
        <Tab.Screen
          key={name}
          name={name}
          component={component}
          options={{
            tabBarIcon: ({focused}) => (
              <TabTile focused={focused} Icon={Icon} />
            ),
            tabBarLabel: ({focused}) => (
              <View>
                <Text
                  numberOfLines={1}
                  style={[styles.label, focused && styles.labelActive]}>
                  {label}
                </Text>
              </View>
            ),
          }}
        />
      ))}
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  bar: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSoft,
    height: 76,
    paddingTop: 11,
    paddingBottom: 12,
    shadowColor: 'rgba(11,27,43,1)',
    shadowOpacity: 0.06,
    shadowRadius: 26,
    shadowOffset: {width: 0, height: -8},
    elevation: 12,
  },
  item: {gap: 5},
  tile: {
    width: 40,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileIdle: {backgroundColor: Colors.surfaceSoft},
  label: {fontSize: 10.5, fontWeight: '700', color: Colors.textMuted},
  labelActive: {fontWeight: '800', color: Colors.primary},
});

export default TabNavigator;
