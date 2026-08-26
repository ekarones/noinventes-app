// API for the mobile app (sellers + admins share the `/api/mobile` prefix). The
// backend is **multitenant**: one host serves N stores, and the tenant is chosen
// by the `X-Tenant: <subdomain>` header on every request (login included) — set
// in memory from the store the user enters at login (see src/api/session.ts) and
// attached by client.ts. Without it the server answers "Tenant no especificado".
//
// Aug-2026: migrated to the project's own hosting + domain (app.noinventes.com).
// It's a single fixed host with header-based tenant resolution (the previous
// hosting needed the per-store subdomain in the URL; this one doesn't). The
// server also accepts a `<tenant>` subdomain, but the header keeps it to one host.
//
// Local dev: point at your LAN IP/host, e.g. 'http://192.168.1.67:8000/api/mobile'.
export const API_BASE_URL = 'https://app.noinventes.com/api/mobile';
