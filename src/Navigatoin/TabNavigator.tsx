/* eslint-disable react/no-unstable-nested-components */
import React from 'react';
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

const Tab = createBottomTabNavigator();

/** The five tabs from SB1: Home · Orders · Catalog · Money · Shop. */
type TabDef = {
  name: string;
  component: React.ComponentType<any>;
  label: string;
  Icon: React.FC<{size?: number; color: string}>;
};

const TABS: TabDef[] = [
  {name: Route.DashBoardScreen, component: Dashboard, label: 'Home', Icon: HomeIcon},
  {name: Route.OrderScreen, component: OrderScreen, label: 'Orders', Icon: OrdersIcon},
  {
    name: Route.CatalogScreen,
    component: CatalogScreen,
    label: 'Catalog',
    Icon: CatalogIcon,
  },
  {name: Route.MoneyScreen, component: MoneyScreen, label: 'Money', Icon: MoneyIcon},
  {name: Route.ShopScreen, component: ShopScreen, label: 'Shop', Icon: ShopIcon},
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

const TabNavigator: React.FC = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarStyle: styles.bar,
      tabBarItemStyle: styles.item,
      tabBarActiveTintColor: Colors.primary,
      tabBarInactiveTintColor: Colors.textMuted,
    }}>
    {TABS.map(({name, component, label, Icon}) => (
      <Tab.Screen
        key={name}
        name={name}
        component={component}
        options={{
          tabBarIcon: ({focused}) => <TabTile focused={focused} Icon={Icon} />,
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
