// API for the mobile app (sellers + admins share the `/api/mobile` prefix). The
// backend is **multitenant**: each store's API lives on its own SUBDOMAIN, and
// the server resolves the tenant — and the tenant DB where the Sanctum token is
// stored — from the HOST. So authenticated requests MUST hit the store's
// subdomain: on the root host the tenant isn't resolved for the API's `sanctum`
// guard, so a freshly-issued token isn't found and every request 401s
// ("Unauthenticated." right after a successful login). The store's subdomain is
// entered at login and kept in memory (src/api/session.ts); the client builds
// the base URL from it on every request (we still send the `X-Tenant` header too).
//
// Local dev: set API_HOST to your LAN IP or host (e.g. '192.168.1.67:8000' or
// 'localhost:8000'). A bare IP / *.localhost can't take a tenant subdomain and
// dev servers speak http, so the base URL falls back to the plain host over http.
const API_HOST = 'stockly.mizonaonline.com';

// A bare IP or a *.localhost host can't be prefixed with a tenant subdomain.
const IS_PLAIN_HOST =
  /^\d{1,3}(\.\d{1,3}){3}(:\d+)?$/.test(API_HOST) || API_HOST.includes('localhost');

// Base URL for a store subdomain, e.g. 'monatekeda' →
// https://monatekeda.stockly.mizonaonline.com/api/mobile. Falls back to the bare
// host when there's no tenant yet (pre-login) or the host can't be subdomained.
export function apiBaseUrl(tenant: string | null): string {
  const scheme = IS_PLAIN_HOST ? 'http' : 'https';
  const host = tenant && !IS_PLAIN_HOST ? `${tenant}.${API_HOST}` : API_HOST;
  return `${scheme}://${host}/api/mobile`;
}
