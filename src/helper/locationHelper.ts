import {PermissionsAndroid, Platform} from 'react-native';

import {PermissionError} from './permissionHelper';

/**
 * "Use my current location" for the shop pin.
 *
 * Geolocation is a native module, so two things are handled here that the app
 * would otherwise crash on: the module is required lazily and defensively (a
 * JS-only reload after installing it has no native side, and the package throws
 * from its own module scope in that case), and the Android permission flow is
 * run by us rather than by the library, so Android 12's precise/approximate
 * choice and "don't ask again" both land somewhere sensible.
 */
export type Coordinates = {latitude: number; longitude: number};

/** Carries a message that is already fit to show the user. */
export class LocationError extends PermissionError {
  constructor(message: string, openSettings = false) {
    super(message, openSettings);
    this.name = 'LocationError';
  }
}

type GeolocationModule = typeof import('@react-native-community/geolocation').default;

let cached: GeolocationModule | null = null;

/**
 * The package throws its "doesn't seem to be linked" error while its own module
 * body runs, so both the require and the first property read have to be
 * guarded — and it must not run at import time, or the whole screen dies.
 */
const loadGeolocation = (): GeolocationModule => {
  if (cached) return cached;

  try {
    const module = require('@react-native-community/geolocation');
    const geolocation: GeolocationModule = module.default ?? module;
    if (typeof geolocation?.getCurrentPosition !== 'function') {
      throw new Error('geolocation module is not usable');
    }
    cached = geolocation;
    return geolocation;
  } catch {
    throw new LocationError(
      'Location needs a fresh build of the app. Rebuild and reinstall, then try again — or enter the pin by hand.',
    );
  }
};

const {PERMISSIONS, RESULTS} = PermissionsAndroid;

/**
 * Android 12 lets someone answer the fine-location prompt with "Approximate",
 * which grants COARSE and *denies* FINE — so asking for FINE alone reads as a
 * refusal. Ask for both and accept either; a shop pin the owner can then nudge
 * by hand is far better than nothing.
 */
const ensureAndroidPermission = async (): Promise<void> => {
  const alreadyGranted =
    (await PermissionsAndroid.check(PERMISSIONS.ACCESS_FINE_LOCATION)) ||
    (await PermissionsAndroid.check(PERMISSIONS.ACCESS_COARSE_LOCATION));

  if (alreadyGranted) return;

  const result = await PermissionsAndroid.requestMultiple([
    PERMISSIONS.ACCESS_FINE_LOCATION,
    PERMISSIONS.ACCESS_COARSE_LOCATION,
  ]);

  const fine = result[PERMISSIONS.ACCESS_FINE_LOCATION];
  const coarse = result[PERMISSIONS.ACCESS_COARSE_LOCATION];

  if (fine === RESULTS.GRANTED || coarse === RESULTS.GRANTED) return;

  if (
    fine === RESULTS.NEVER_ASK_AGAIN ||
    coarse === RESULTS.NEVER_ASK_AGAIN
  ) {
    throw new LocationError(
      'Location is blocked for Aqua Flow. Turn it on in Settings → Permissions, or enter the pin by hand.',
      true,
    );
  }

  throw new LocationError(
    'Location permission was denied. Allow it to drop the pin automatically, or enter it by hand.',
  );
};

const ensureIOSPermission = (geolocation: GeolocationModule) =>
  new Promise<void>((resolve, reject) => {
    geolocation.requestAuthorization(
      () => resolve(),
      () =>
        reject(
          new LocationError(
            'Location is turned off for Aqua Flow. Turn it on in Settings, or enter the pin by hand.',
            true,
          ),
        ),
    );
  });

/** POSITION_UNAVAILABLE and TIMEOUT read the same to a user; code 1 doesn't. */
const positionError = (code?: number): LocationError => {
  if (code === 1) {
    return new LocationError(
      'Location permission was denied. Allow it in Settings, or enter the pin by hand.',
      true,
    );
  }
  if (code === 2) {
    return new LocationError(
      'Could not reach the location service. Check that Location is switched on, or enter the pin by hand.',
    );
  }
  return new LocationError(
    'Could not get a fix. Try again near a window or outdoors, or enter the pin by hand.',
  );
};

const readPosition = (
  geolocation: GeolocationModule,
  highAccuracy: boolean,
): Promise<Coordinates> =>
  new Promise<Coordinates>((resolve, reject) => {
    geolocation.getCurrentPosition(
      position =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      error => reject(positionError(error?.code)),
      {
        enableHighAccuracy: highAccuracy,
        timeout: highAccuracy ? 15000 : 30000,
        maximumAge: 10000,
      },
    );
  });

export const getCurrentCoordinates = async (): Promise<Coordinates> => {
  const geolocation = loadGeolocation();

  if (Platform.OS === 'android') {
    await ensureAndroidPermission();
  } else {
    await ensureIOSPermission(geolocation);
  }

  try {
    return await readPosition(geolocation, true);
  } catch (error) {
    // A GPS fix can time out indoors — the network/cell fix is coarser but is
    // still a far better starting point than an empty field.
    if (error instanceof LocationError && !error.openSettings) {
      return readPosition(geolocation, false);
    }
    throw error;
  }
};

/** The pin fields are strings; six decimals is roughly 0.1 m of precision. */
export const formatCoordinate = (value: number): string => value.toFixed(6);
