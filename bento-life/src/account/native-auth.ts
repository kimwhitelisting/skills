import { SecureStorage, KeychainAccess } from '@aparajita/capacitor-secure-storage';
/** Never fall back to Preferences/plain storage if native secure storage fails. */
export async function nativeAuthStorage() {
  await SecureStorage.setSynchronize(false);
  await SecureStorage.setKeyPrefix('bento.auth.');
  await SecureStorage.setDefaultKeychainAccess(KeychainAccess.whenUnlockedThisDeviceOnly);
  return {
    getItem: async (key: string): Promise<string | null> => {
      const value = await SecureStorage.get(key, false, false);
      if (value === null || typeof value === 'string') return value;
      throw Error('Invalid secure auth data');
    },
    setItem: (key: string, value: string) => SecureStorage.set(key, value, false, false, KeychainAccess.whenUnlockedThisDeviceOnly),
    removeItem: async (key: string) => { await SecureStorage.remove(key, false); },
  };
}
