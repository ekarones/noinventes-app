// Holds the current Bearer token in memory so authenticated API calls can attach
// it automatically without prop-drilling. AuthContext keeps this in sync with
// login / session-restore / logout.
let currentToken: string | null = null;

export function setSessionToken(token: string | null): void {
  currentToken = token;
}

export function getSessionToken(): string | null {
  return currentToken;
}

// The active tenant's subdomain, held in memory alongside the token. The backend
// is multitenant: EVERY request (login included) must carry `X-Tenant: <subdomain>`
// so the server resolves the store before authenticating. Keeping it here lets the
// API client attach the header synchronously, without threading it through every
// call. AuthContext sets it on login, on session-restore, and before the login
// request itself (so the store is known even before there's a token).
let currentTenant: string | null = null;

export function setSessionTenant(tenant: string | null): void {
  currentTenant = tenant;
}

export function getSessionTenant(): string | null {
  return currentTenant;
}

// Called by the API client when an authenticated request (one that used the
// stored session token) is rejected with 401 — i.e. the token was revoked or
// expired. AuthContext registers a handler that clears the session and bounces
// the user to the login screen, so every screen doesn't need to handle 401.
let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(fn: (() => void) | null): void {
  unauthorizedHandler = fn;
}

export function notifyUnauthorized(): void {
  unauthorizedHandler?.();
}
