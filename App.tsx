// App.tsx
import React, {useEffect, useState} from 'react';
import {
  Modal,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import NetInfo from '@react-native-community/netinfo';

import NavigationContainers from './src/Navigatoin/NavigationContainers';
import {Colors} from './src/Constant/Colors';

const AppContent = () => {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setOffline(!(state.isConnected ?? true));
    });
    return () => unsubscribe();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      <NavigationContainers />

      <Modal
        animationType="fade"
        transparent={false}
        visible={offline}
        onRequestClose={() => setOffline(false)}>
        <View style={styles.offline}>
          <View style={styles.offlineGlyph} />
          <Text style={styles.offlineTitle}>No internet connection</Text>
          <Text style={styles.offlineBody}>
            Orders, stock and payouts all need a connection. Check your network
            and this will clear itself.
          </Text>
        </View>
      </Modal>

      <Toast />
    </SafeAreaView>
  );
};

const App = () => (
  <SafeAreaProvider>
    <AppContent />
  </SafeAreaProvider>
);

export default App;

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: Colors.white},
  offline: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 34,
  },
  offlineGlyph: {
    width: 84,
    height: 84,
    borderRadius: 26,
    backgroundColor: Colors.primaryTint,
    marginBottom: 22,
  },
  offlineTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 10,
  },
  offlineBody: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
  },
});
