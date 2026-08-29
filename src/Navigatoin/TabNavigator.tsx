/* eslint-disable react/no-unstable-nested-components */
import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';

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
          tabBarIcon: ({focused}) => (
            <Icon color={focused ? Colors.primary : Colors.textMuted} size={22} />
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

const styles = StyleSheet.create({
  bar: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSoft,
    height: 66,
    paddingTop: 8,
    paddingBottom: 10,
  },
  item: {gap: 2},
  label: {fontSize: 10.5, fontWeight: '700', color: Colors.textMuted},
  labelActive: {fontWeight: '800', color: Colors.primary},
});

export default TabNavigator;
