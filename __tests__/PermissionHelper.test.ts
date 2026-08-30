import {PermissionsAndroid, Platform} from 'react-native';
import {
  PermissionError,
  ensureCameraPermission,
} from '../src/helper/permissionHelper';

describe('camera permission', () => {
  beforeEach(() => {
    (Platform as any).OS = 'android';
    jest.restoreAllMocks();
  });

  test('already granted goes straight through, no prompt', async () => {
    jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(true as any);
    const request = jest.spyOn(PermissionsAndroid, 'request');
    await expect(ensureCameraPermission()).resolves.toBeUndefined();
    expect(request).not.toHaveBeenCalled();
  });

  test('not granted prompts, and a grant proceeds', async () => {
    jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(false as any);
    const request = jest
      .spyOn(PermissionsAndroid, 'request')
      .mockResolvedValue('granted' as any);
    await expect(ensureCameraPermission()).resolves.toBeUndefined();
    expect(request).toHaveBeenCalledTimes(1);
  });

  test('a plain deny still re-prompts next time', async () => {
    jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(false as any);
    const request = jest
      .spyOn(PermissionsAndroid, 'request')
      .mockResolvedValue('denied' as any);

    await expect(ensureCameraPermission()).rejects.toMatchObject({
      openSettings: false,
    });
    await expect(ensureCameraPermission()).rejects.toBeInstanceOf(PermissionError);
    expect(request).toHaveBeenCalledTimes(2); // asked again, not remembered
  });

  test('never_ask_again asks the caller to open settings', async () => {
    jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(false as any);
    jest
      .spyOn(PermissionsAndroid, 'request')
      .mockResolvedValue('never_ask_again' as any);
    await expect(ensureCameraPermission()).rejects.toMatchObject({
      openSettings: true,
    });
  });

  test('ios defers to the native picker prompt', async () => {
    (Platform as any).OS = 'ios';
    const check = jest.spyOn(PermissionsAndroid, 'check');
    await expect(ensureCameraPermission()).resolves.toBeUndefined();
    expect(check).not.toHaveBeenCalled();
  });
});
