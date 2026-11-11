import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import Route from '../Constant/NavigationStrings';
import TabNavigator from './TabNavigator';
import {
  AdjustStockScreen,
  ApplicationStatusScreen,
  ApplyScreen,
  BusinessHoursScreen,
  ComplianceScreen,
  CompleteDeliveryScreen,
  ChangePasswordScreen,
  ContainerLedgerScreen,
  CreateShopScreen,
  CreateTicketScreen,
  CustomerFormScreen,
  CustomersScreen,
  DeliverWithoutOtpScreen,
  DisputeDetailScreen,
  DisputesScreen,
  EditProfileScreen,
  ForgetPassword,
  HolidaysScreen,
  Login,
  NewOrderScreen,
  NotificationScreen,
  OrderDetailScreen,
  OrderMessagesScreen,
  PaymentsScreen,
  PayoutAccountsScreen,
  ProductFormScreen,
  ProfileScreen,
  RaiseDisputeScreen,
  ResetPassword,
  ServiceZonesScreen,
  SettlementDetailScreen,
  ShopDetailsScreen,
  SplashScreen,
  StaffFormScreen,
  StaffScreen,
  StatementsScreen,
  SupportScreen,
  TicketDetailScreen,
} from './index';

const Stack = createNativeStackNavigator();

/**
 * One stack for the whole app. SplashScreen decides where a cold start lands —
 * Login when there's no token, Main once the shop has been resolved — so the
 * navigator itself doesn't need to branch.
 */
const Routes: React.FC = () => (
  <Stack.Navigator
    initialRouteName={Route.SplashScreen}
    screenOptions={{headerShown: false}}>
    {/* Auth / onboarding */}
    <Stack.Screen name={Route.SplashScreen} component={SplashScreen} />
    <Stack.Screen name={Route.Login} component={Login} />
    <Stack.Screen name={Route.ForgetPassword} component={ForgetPassword} />
    <Stack.Screen name={Route.ResetPassword} component={ResetPassword} />
    <Stack.Screen name={Route.ApplyScreen} component={ApplyScreen} />
    <Stack.Screen
      name={Route.ApplicationStatusScreen}
      component={ApplicationStatusScreen}
    />

    {/* Tabs */}
    <Stack.Screen name={Route.Main} component={TabNavigator} />

    {/* Orders */}
    <Stack.Screen name={Route.OrderDetailScreen} component={OrderDetailScreen} />
    <Stack.Screen
      name={Route.CompleteDeliveryScreen}
      component={CompleteDeliveryScreen}
    />
    <Stack.Screen
      name={Route.DeliverWithoutOtpScreen}
      component={DeliverWithoutOtpScreen}
    />
    <Stack.Screen
      name={Route.OrderMessagesScreen}
      component={OrderMessagesScreen}
    />
    <Stack.Screen name={Route.NewOrderScreen} component={NewOrderScreen} />

    {/* Catalog */}
    <Stack.Screen name={Route.ProductFormScreen} component={ProductFormScreen} />
    <Stack.Screen name={Route.AdjustStockScreen} component={AdjustStockScreen} />
    <Stack.Screen
      name={Route.ContainerLedgerScreen}
      component={ContainerLedgerScreen}
    />

    {/* Money */}
    <Stack.Screen name={Route.StatementsScreen} component={StatementsScreen} />
    <Stack.Screen
      name={Route.SettlementDetailScreen}
      component={SettlementDetailScreen}
    />
    <Stack.Screen
      name={Route.PayoutAccountsScreen}
      component={PayoutAccountsScreen}
    />
    <Stack.Screen name={Route.PaymentsScreen} component={PaymentsScreen} />

    {/* Shop settings */}
    <Stack.Screen name={Route.ShopDetailsScreen} component={ShopDetailsScreen} />
    <Stack.Screen name={Route.CreateShopScreen} component={CreateShopScreen} />
    <Stack.Screen
      name={Route.BusinessHoursScreen}
      component={BusinessHoursScreen}
    />
    <Stack.Screen name={Route.HolidaysScreen} component={HolidaysScreen} />
    <Stack.Screen name={Route.ServiceZonesScreen} component={ServiceZonesScreen} />

    {/* Compliance */}
    <Stack.Screen name={Route.ComplianceScreen} component={ComplianceScreen} />

    {/* Support & disputes */}
    <Stack.Screen name={Route.SupportScreen} component={SupportScreen} />
    <Stack.Screen name={Route.TicketDetailScreen} component={TicketDetailScreen} />
    <Stack.Screen name={Route.CreateTicketScreen} component={CreateTicketScreen} />
    <Stack.Screen name={Route.DisputesScreen} component={DisputesScreen} />
    <Stack.Screen
      name={Route.DisputeDetailScreen}
      component={DisputeDetailScreen}
    />
    <Stack.Screen name={Route.RaiseDisputeScreen} component={RaiseDisputeScreen} />

    {/* Account */}
    <Stack.Screen name={Route.NotificationScreen} component={NotificationScreen} />
    <Stack.Screen name={Route.ProfileScreen} component={ProfileScreen} />
    <Stack.Screen name={Route.EditProfileScreen} component={EditProfileScreen} />
    <Stack.Screen
      name={Route.ChangePasswordScreen}
      component={ChangePasswordScreen}
    />

    {/* Customers & staff */}
    <Stack.Screen name={Route.CustomersScreen} component={CustomersScreen} />
    <Stack.Screen
      name={Route.CustomerFormScreen}
      component={CustomerFormScreen}
    />
    <Stack.Screen name={Route.StaffScreen} component={StaffScreen} />
    <Stack.Screen name={Route.StaffFormScreen} component={StaffFormScreen} />
  </Stack.Navigator>
);

export default Routes;
