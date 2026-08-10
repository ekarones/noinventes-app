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
import { setSessionTenant, setSessionToken, setUnauthorizedHandler } from '../api/session';
import { getTenant, getToken, saveTenant, saveToken, deleteToken } from '../auth/tokenStorage';

type AuthContextValue = {
  user: User | null;
  // true while we restore a saved session on startup (avoids a login flash).
  initializing: boolean;
  // The subdomain of the last store signed into, kept to pre-fill the login form
  // (persisted across restarts and sign-outs). null until the first login.
  lastTenant: string | null;
  // Authenticates against the store `subdomain`. Throws ApiError on failure
  // (handled by the UI).
  signIn: (subdomain: string, email: string, password: string) => Promise<void>;
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
  // The store the session belongs to. Also drives the login form's pre-fill, so
  // it outlives the token (a sign-out keeps it; only switching stores changes it).
  const [lastTenant, setLastTenant] = useState<string | null>(null);
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
      // Clear the token only — keep the tenant (in memory + persisted) so the
      // login screen pre-fills the store the user was in.
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
        const [saved, savedTenant] = await Promise.all([getToken(), getTenant()]);
        // Restore the tenant regardless of the token: even when the token has
        // expired, the stored subdomain pre-fills the login form.
        if (savedTenant) {
          setSessionTenant(savedTenant);
          setLastTenant(savedTenant);
        }
        // A token without its tenant can't be validated (every request needs the
        // X-Tenant header), so both must be present to restore a live session.
        if (saved && savedTenant) {
          const me = await fetchMe(saved);
          setSessionToken(saved);
          setToken(saved);
          setUser(me);
        }
      } catch {
        // token missing/invalid/revoked → start logged out (keep the tenant)
        await deleteToken();
      } finally {
        setInitializing(false);
      }
    })();
  }, []);

  async function signIn(subdomain: string, email: string, password: string) {
    const store = subdomain.trim().toLowerCase();
    // The tenant must be set BEFORE the login request — the server resolves the
    // store from X-Tenant before authenticating, and login carries no token.
    setSessionTenant(store);
    const { token: newToken, user: loggedUser } = await apiLogin(
      email.trim(),
      password,
      DEVICE_NAME
    );
    await Promise.all([saveToken(newToken), saveTenant(store)]);
    setSessionToken(newToken);
    setToken(newToken);
    setLastTenant(store);
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
    // Clear the token but KEEP the tenant (in memory + persisted): the next login
    // pre-fills the store, and sellers/admins of one shop don't switch stores.
    await deleteToken();
    setSessionToken(null);
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, initializing, lastTenant, signIn, signOut, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
