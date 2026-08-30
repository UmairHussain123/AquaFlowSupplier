import {Alert, Linking, PermissionsAndroid, Platform} from 'react-native';

/**
 * Runtime permissions, asked at the moment they are needed.
 *
 * Android only checks-then-asks: iOS prompts through the native picker itself
 * the first time, and re-prompting from JS there is not possible anyway.
 */

/** Carries a message that is already fit to show the user. */
export class PermissionError extends Error {
  /** Android has stopped prompting — only Settings can undo this. */
  openSettings: boolean;

  constructor(message: string, openSettings = false) {
    super(message);
    this.name = 'PermissionError';
    this.openSettings = openSettings;
  }
}

const {PERMISSIONS, RESULTS} = PermissionsAndroid;

/**
 * CAMERA is declared in the manifest, which makes the runtime grant mandatory —
 * without it `launchCamera` fails rather than opening. Checking first means an
 * already-granted device goes straight to the camera; every other time the
 * dialog is shown again, so a stray "Deny" is never permanent.
 */
export const ensureCameraPermission = async (): Promise<void> => {
  if (Platform.OS !== 'android') return;

  if (await PermissionsAndroid.check(PERMISSIONS.CAMERA)) return;

  const result = await PermissionsAndroid.request(PERMISSIONS.CAMERA, {
    title: 'Use the camera',
    message:
      'Aqua Flow needs the camera to photograph your licence, lab report or shopfront.',
    buttonPositive: 'Allow',
    buttonNegative: 'Not now',
  });

  if (result === RESULTS.GRANTED) return;

  if (result === RESULTS.NEVER_ASK_AGAIN) {
    throw new PermissionError(
      'Camera access is blocked for Aqua Flow. Turn it on in Settings → Permissions, or choose an existing photo instead.',
      true,
    );
  }

  throw new PermissionError(
    'Camera permission was denied. Allow it to take a photo, or choose an existing photo instead.',
  );
};

/**
 * Once the OS stops prompting, a toast is a dead end — the only way forward is
 * Settings, so that case gets an alert with a way there.
 */
export const permissionAlert = (
  title: string,
  error: unknown,
  fallback: string,
): void => {
  const message = error instanceof PermissionError ? error.message : fallback;

  Alert.alert(title, message, [
    {text: 'Not now', style: 'cancel'},
    {text: 'Open settings', onPress: () => Linking.openSettings()},
  ]);
};
