// API base URL for the mobile API (sellers + admins share the `/api/mobile`
// prefix). The backend is **multitenant**: one host root serves N stores, and
// every request must carry an `X-Tenant: <subdomain>` header to pick the store
// (see src/api/session.ts + the X-Tenant wiring in client.ts). Without it the
// server answers `400 Tenant no especificado`.
//
// Production (HTTPS) — reachable from any network, no cleartext needed.
// For local development against the dev server you have two options:
//   1. Point at your PC's LAN IP and keep sending the X-Tenant header, e.g.
//      export const API_BASE_URL = 'http://192.168.1.67:8000/api/mobile';
//   2. Point at the tenant's subdomain host so the server resolves it from the
//      host (the X-Tenant header still wins if both are present), e.g.
//      export const API_BASE_URL = 'http://demo.localhost:8000/api/mobile';
export const API_BASE_URL = 'https://stockly.mizonaonline.com/api/mobile';
