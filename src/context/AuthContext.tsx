import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Alert, Platform } from 'react-native';
import { login as apiLogin, fetchMe, logout as apiLogout, type User } from '../api/auth';
import { setSessionToken, setUnauthorizedHandler } from '../api/session';
import { deleteToken, getToken, saveToken } from '../auth/tokenStorage';

type AuthContextValue = {
  user: User | null;
  // true while we restore a saved session on startup (avoids a login flash).
  initializing: boolean;
  // Authenticates against the API. Throws ApiError on failure (handled by the UI).
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  // Re-fetches /me to refresh the profile/branch without re-logging in.
  // Throws ApiError on failure (e.g. 401 if the token was revoked).
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// Identifies this device to the admin panel (for revoking a specific token).
const DEVICE_NAME = `App móvil (${Platform.OS})`;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  // Guards against showing the "session expired" alert multiple times when
  // several in-flight requests all get a 401 at once.
  const expiringRef = useRef(false);

  // Register the global 401 handler: if the stored token is revoked/expired, any
  // authenticated request triggers this, clearing the session and returning to
  // the login screen (with a single heads-up).
  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (expiringRef.current) return;
      expiringRef.current = true;
      deleteToken();
      setSessionToken(null);
      setToken(null);
      setUser(null);
      Alert.alert('Sesión expirada', 'Tu sesión ha finalizado. Inicia sesión nuevamente.');
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  // On startup: if there's a saved token, validate it with /me (it may have been
  // revoked by an admin) and refresh the profile/branch.
  useEffect(() => {
    (async () => {
      try {
        const saved = await getToken();
        if (saved) {
          const me = await fetchMe(saved);
          setSessionToken(saved);
          setToken(saved);
          setUser(me);
        }
      } catch {
        // token missing/invalid/revoked → start logged out
        await deleteToken();
      } finally {
        setInitializing(false);
      }
    })();
  }, []);

  async function signIn(email: string, password: string) {
    const { token: newToken, user: loggedUser } = await apiLogin(
      email.trim(),
      password,
      DEVICE_NAME
    );
    await saveToken(newToken);
    setSessionToken(newToken);
    setToken(newToken);
    setUser(loggedUser);
    expiringRef.current = false; // allow future expiry to notify again
  }

  async function refresh() {
    if (!token) return;
    const me = await fetchMe(token);
    setUser(me);
  }

  async function signOut() {
    // Best-effort server revoke; always clear locally even if it fails.
    try {
      if (token) await apiLogout(token);
    } catch {
      // ignore network errors on logout
    }
    await deleteToken();
    setSessionToken(null);
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, initializing, signIn, signOut, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
