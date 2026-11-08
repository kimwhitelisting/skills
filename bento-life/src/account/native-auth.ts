import { SecureStorage, KeychainAccess } from '@aparajita/capacitor-secure-storage';
import { Capacitor } from '@capacitor/core';
import { NativeAuthRecovery } from './native-auth-recovery.ts';
/** Never fall back to Preferences/plain storage if native secure storage fails. */
export async function nativeAuthStorage() {
  await SecureStorage.setSynchronize(false);
  await SecureStorage.setKeyPrefix('bento.auth.');
  await SecureStorage.setDefaultKeychainAccess(KeychainAccess.whenUnlockedThisDeviceOnly);
  const recovery = new NativeAuthRecovery({
    get: key => SecureStorage.get(key, false, false),
    // The Android-only recovery tombstone uses the plugin's encrypted raw-string API.
    // Its DataType overload excludes null, while get() decodes the stored JSON null.
    set: (key, value) => value === null ? SecureStorage.setItem(key, 'null')
      : SecureStorage.set(key, value, false, false, KeychainAccess.whenUnlockedThisDeviceOnly),
    remove: key => SecureStorage.remove(key, false),
  }, Capacitor.getPlatform());
  return {
    recovery,
    getItem: (key: string) => recovery.getItem(key),
    setItem: (key: string, value: string) => recovery.setItem(key, value),
    removeItem: (key: string) => recovery.removeItem(key),
  };
}
