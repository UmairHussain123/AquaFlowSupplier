/**
 * The staging supplier account, pre-filled into the login form so a debug
 * build doesn't have to be typed into on every reload.
 *
 * The literals live *inside* the `__DEV__` branch on purpose: Metro replaces
 * `__DEV__` with `false` in a release bundle and the minifier then drops the
 * dead branch, so the account never ships inside a release APK.
 */
export const devLogin = (): {email: string; password: string} =>
  __DEV__
    ? {email: 'freshsprings@aquago.test', password: 'password'}
    : {email: '', password: ''};
