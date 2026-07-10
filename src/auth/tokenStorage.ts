import * as SecureStore from 'expo-secure-store';

// Securely persists the Bearer token (Keychain on iOS / EncryptedSharedPreferences
// on Android) so the session survives app restarts.
const TOKEN_KEY = 'seller_auth_token';

export async function saveToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function deleteToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
