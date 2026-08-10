import * as SecureStore from 'expo-secure-store';

// Securely persists the session (Keychain on iOS / EncryptedSharedPreferences on
// Android) so it survives app restarts. Two values travel together:
//   - the Bearer token, and
//   - the tenant subdomain the token belongs to (the store the user logged into).
// The multitenant backend needs the subdomain on every request, so it must be
// restored on startup exactly like the token. They're saved and cleared as a pair.
const TOKEN_KEY = 'seller_auth_token';
const TENANT_KEY = 'tenant_subdomain';

export async function saveToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function deleteToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function saveTenant(subdomain: string): Promise<void> {
  await SecureStore.setItemAsync(TENANT_KEY, subdomain);
}

export async function getTenant(): Promise<string | null> {
  return SecureStore.getItemAsync(TENANT_KEY);
}

export async function deleteTenant(): Promise<void> {
  await SecureStore.deleteItemAsync(TENANT_KEY);
}
