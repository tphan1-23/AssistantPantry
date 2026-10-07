import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const PASSWORD_KEY = 'pantry_assistant_cached_password';
const EMAIL_KEY = 'pantry_assistant_cached_password_email';

// expo-secure-store's web implementation is a literal empty stub (no
// functions at all) - calling setItemAsync/getItemAsync/deleteItemAsync on
// web throws immediately. There's no browser equivalent to an encrypted
// native keystore anyway, and no Face ID/Touch ID gate to protect a cached
// password with even if there were, so this is a deliberate no-op on web
// rather than a fallback to plain (unencrypted) localStorage.
const isSupported = Platform.OS !== 'web';

/**
 * Caches a password in the device's encrypted secure storage (iOS Keychain /
 * Android Keystore), scoped to the account that just authenticated. This is
 * the ONLY place a real password exists outside the user's head - Supabase
 * (like every auth system) stores it as a one-way hash, never retrievable
 * from the server, so "reveal my password" in the Account screen can only
 * ever mean "show the local copy this device saved," never "fetch the real
 * one back from Supabase."
 */
export async function cachePassword(email: string, password: string) {
  if (!isSupported) return;
  await SecureStore.setItemAsync(PASSWORD_KEY, password);
  await SecureStore.setItemAsync(EMAIL_KEY, email);
}

/** Returns the cached password only if it was cached for this exact email - a stale cache from a previously signed-in account on this device is never returned as if it belonged to the current one. Always null on web - see isSupported above. */
export async function getCachedPassword(email: string): Promise<string | null> {
  if (!isSupported) return null;
  const cachedEmail = await SecureStore.getItemAsync(EMAIL_KEY);
  if (cachedEmail !== email) return null;
  return SecureStore.getItemAsync(PASSWORD_KEY);
}

export async function clearCachedPassword() {
  if (!isSupported) return;
  await SecureStore.deleteItemAsync(PASSWORD_KEY);
  await SecureStore.deleteItemAsync(EMAIL_KEY);
}
