import React from 'react';
import {Alert, BackHandler, Platform} from 'react-native';
import {
  NavigationContainer,
  DefaultTheme as NavDefaultTheme,
} from '@react-navigation/native';
import {Provider as ReduxProvider} from 'react-redux';
import {PaperProvider, MD3LightTheme as DefaultTheme} from 'react-native-paper';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {PersistGate} from 'redux-persist/integration/react';

import Routes from './Routes';
import {persistor, store} from '../Redux/store';
import {navigationRef, setNavigationReady} from './NavigationService';
import {Colors} from '../Constant/Colors';
import GlobalLoader from '../Component/GlobalLoader/GlobalLoader';
import {Fonts} from '../Constant/Fonts';

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.primary,
    secondary: Colors.accentTeal,
    surface: Colors.white,
    background: Colors.surface,
  },
  fonts: {
    ...DefaultTheme.fonts,
    regular: {fontFamily: Fonts.regular},
    medium: {fontFamily: Fonts.medium},
  },
  roundness: 12,
} as any;

const navigationTheme = {
  ...NavDefaultTheme,
  colors: {...NavDefaultTheme.colors, background: Colors.surface},
};

const NavigationContainers: React.FC = () => {
  const exitAlertVisibleRef = React.useRef(false);

  // Android hardware back: pop the stack, and confirm before leaving the app.
  React.useEffect(() => {
    if (Platform.OS !== 'android') return;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      const navigation: any = navigationRef.current;
      if (navigation?.canGoBack()) {
        navigation.goBack();
        return true;
      }

      if (exitAlertVisibleRef.current) return true;
      exitAlertVisibleRef.current = true;

      Alert.alert(
        'Exit app',
        'Are you sure you want to close Aqua Flow Supplier?',
        [
          {
            text: 'No',
            style: 'cancel',
            onPress: () => {
              exitAlertVisibleRef.current = false;
            },
          },
          {
            text: 'Yes',
            onPress: () => {
              exitAlertVisibleRef.current = false;
              BackHandler.exitApp();
            },
          },
        ],
        {
          cancelable: true,
          onDismiss: () => {
            exitAlertVisibleRef.current = false;
          },
        },
      );

      return true;
    });

    return () => {
      exitAlertVisibleRef.current = false;
      subscription.remove();
    };
  }, []);

  return (
    <ReduxProvider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <PaperProvider theme={theme}>
          <SafeAreaProvider>
            <NavigationContainer
              ref={navigationRef}
              theme={navigationTheme}
              onReady={() => setNavigationReady(true)}>
              <Routes />
            </NavigationContainer>
            {/* Reads the `loading` slice, so it has to sit inside the Provider. */}
            <GlobalLoader />
          </SafeAreaProvider>
        </PaperProvider>
      </PersistGate>
    </ReduxProvider>
  );
};

export default NavigationContainers;
