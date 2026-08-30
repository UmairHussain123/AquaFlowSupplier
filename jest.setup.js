/* eslint-env jest */
global.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock(
  '@react-native-async-storage/async-storage',
  () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Keychain, NetInfo and DeviceInfo all reach for native modules that don't
// exist under Jest — stub the handful of calls the app actually makes.
jest.mock('react-native-keychain', () => ({
  ACCESSIBLE: {WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'whenUnlocked'},
  SECURITY_LEVEL: {SECURE_HARDWARE: 'secure', ANY: 'any'},
  setGenericPassword: jest.fn(async () => true),
  getGenericPassword: jest.fn(async () => false),
  resetGenericPassword: jest.fn(async () => true),
}));

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn(async () => ({isConnected: true})),
}));

jest.mock('react-native-device-info', () => ({
  getUniqueId: jest.fn(async () => 'jest-device'),
  getBundleId: jest.fn(() => 'com.aquaflowsupplier'),
  getVersion: jest.fn(() => '0.0.1'),
}));

jest.mock('@react-native-community/geolocation', () => ({
  getCurrentPosition: jest.fn(),
  requestAuthorization: jest.fn(success => success()),
  watchPosition: jest.fn(() => 0),
  clearWatch: jest.fn(),
}));

jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn(async () => ({didCancel: true})),
  launchImageLibrary: jest.fn(async () => ({didCancel: true})),
}));

jest.mock('@env', () => ({API_URL: 'https://example.test/api/v1'}), {
  virtual: true,
});
