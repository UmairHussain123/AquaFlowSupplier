import {PermissionsAndroid, Platform} from 'react-native';

describe('location helper', () => {
  beforeEach(() => jest.resetModules());

  test('missing native module gives a friendly error, not a crash', async () => {
    jest.doMock('@react-native-community/geolocation', () => {
      throw new Error("doesn't seem to be linked");
    });
    const {getCurrentCoordinates, LocationError} = require('../src/helper/locationHelper');
    await expect(getCurrentCoordinates()).rejects.toBeInstanceOf(LocationError);
    await expect(getCurrentCoordinates()).rejects.toThrow(/fresh build/);
  });

  test('android 12 "Approximate" (coarse only) still counts as granted', async () => {
    (Platform as any).OS = 'android';
    jest.doMock('@react-native-community/geolocation', () => ({
      default: {
        getCurrentPosition: (ok: any) =>
          ok({coords: {latitude: 31.5204, longitude: 74.3587}}),
      },
    }));
    jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(false as any);
    jest.spyOn(PermissionsAndroid, 'requestMultiple').mockResolvedValue({
      'android.permission.ACCESS_FINE_LOCATION': 'denied',
      'android.permission.ACCESS_COARSE_LOCATION': 'granted',
    } as any);

    const {getCurrentCoordinates} = require('../src/helper/locationHelper');
    await expect(getCurrentCoordinates()).resolves.toEqual({
      latitude: 31.5204,
      longitude: 74.3587,
    });
  });

  test('never_ask_again asks the caller to open settings', async () => {
    (Platform as any).OS = 'android';
    jest.doMock('@react-native-community/geolocation', () => ({
      default: {getCurrentPosition: jest.fn()},
    }));
    jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(false as any);
    jest.spyOn(PermissionsAndroid, 'requestMultiple').mockResolvedValue({
      'android.permission.ACCESS_FINE_LOCATION': 'never_ask_again',
      'android.permission.ACCESS_COARSE_LOCATION': 'never_ask_again',
    } as any);

    const {getCurrentCoordinates} = require('../src/helper/locationHelper');
    await expect(getCurrentCoordinates()).rejects.toMatchObject({
      openSettings: true,
    });
  });

  test('already-granted skips the prompt', async () => {
    (Platform as any).OS = 'android';
    jest.doMock('@react-native-community/geolocation', () => ({
      default: {
        getCurrentPosition: (ok: any) => ok({coords: {latitude: 1, longitude: 2}}),
      },
    }));
    jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(true as any);
    const request = jest.spyOn(PermissionsAndroid, 'requestMultiple');

    const {getCurrentCoordinates} = require('../src/helper/locationHelper');
    await getCurrentCoordinates();
    expect(request).not.toHaveBeenCalled();
  });

  test('a high-accuracy timeout falls back to a coarse fix', async () => {
    (Platform as any).OS = 'android';
    let call = 0;
    jest.doMock('@react-native-community/geolocation', () => ({
      default: {
        getCurrentPosition: (ok: any, fail: any) => {
          call += 1;
          if (call === 1) return fail({code: 3});
          return ok({coords: {latitude: 9, longitude: 9}});
        },
      },
    }));
    jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(true as any);

    const {getCurrentCoordinates} = require('../src/helper/locationHelper');
    await expect(getCurrentCoordinates()).resolves.toEqual({
      latitude: 9,
      longitude: 9,
    });
    expect(call).toBe(2);
  });
});
