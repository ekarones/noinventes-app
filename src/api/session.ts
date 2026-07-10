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
