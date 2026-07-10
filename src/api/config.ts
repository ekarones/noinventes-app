// API base URL for the mobile API (sellers + admins share the `/api/mobile`
// prefix; the old `/api/seller` prefix was removed with no compatibility alias).
//
// Production (HTTPS) — reachable from any network, no cleartext needed.
// For local development against the dev server, temporarily switch to your
// PC's LAN IP (the phone must be on the same Wi-Fi), e.g.:
//   export const API_BASE_URL = 'http://192.168.1.67:8000/api/mobile';
export const API_BASE_URL = 'https://inventario.monatekeda.com/api/mobile';
