import { API_BASE_URL } from './config';
import { getSessionTenant, getSessionToken, notifyUnauthorized } from './session';

// Shape of Laravel-style validation errors: { field: ["msg", ...] }
type FieldErrors = Record<string, string[]>;

// Thrown for any non-2xx response (and network failures). Carries enough info
// for the UI to show a friendly message and inspect the status if needed.
export class ApiError extends Error {
  status: number;
  errors?: FieldErrors;

  constructor(message: string, status: number, errors?: FieldErrors) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  token?: string | null;
  // Abort the request after this many ms (used by non-idempotent POSTs).
  timeoutMs?: number;
};

// Status used when a request is aborted by our own timeout.
export const TIMEOUT_STATUS = 408;

// Picks the most useful message: server message, else the first validation
// error (e.g. "Stock insuficiente. Disponible: 3, requerido: 5."), else generic.
function extractMessage(data: any, status: number): string {
  if (data?.message) return data.message;
  if (data?.errors && typeof data.errors === 'object') {
    const first = Object.values(data.errors)[0];
    if (Array.isArray(first) && first.length) return String(first[0]);
  }
  return `Error ${status}. Inténtalo de nuevo.`;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, timeoutMs } = options;
  // Use an explicit token if provided (login/me/logout); otherwise fall back to
  // the stored session token so authenticated endpoints just work.
  const usesSessionToken = !('token' in options);
  const token = usesSessionToken ? getSessionToken() : options.token;

  // Always send a JSON body on mutations — even an empty {} — so a bodyless
  // POST/DELETE isn't rejected by the server's WAF (ModSecurity returns a 406
  // HTML page for POSTs with no Content-Type).
  const effectiveBody = method === 'GET' ? undefined : body ?? {};

  // File uploads pass a FormData: it must go through unserialized, and we must
  // NOT set Content-Type — fetch adds it with the required multipart boundary.
  const isMultipart = effectiveBody instanceof FormData;

  // The API host (Apache/WAF) strips real PUT/DELETE — they reach Laravel as GET
  // ("The GET method is not supported… Supported: PUT, DELETE"). Tunnel them as
  // POST + Laravel's method-override header so routing still sees PUT/DELETE, and
  // keep the JSON body. Multipart updates already POST with a `_method` field, so
  // they're POST here and pass through untouched.
  const wireMethod: RequestOptions['method'] =
    method === 'PUT' || method === 'DELETE' ? 'POST' : method;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (effectiveBody !== undefined && !isMultipart) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  // Multitenant backend: the tenant subdomain scopes every request (login too).
  // It's set in memory before any request goes out; without it the server 400s.
  const tenant = getSessionTenant();
  if (tenant) headers['X-Tenant'] = tenant;
  // Tell Laravel the real verb when we tunnel PUT/DELETE over POST (see above).
  if (wireMethod !== method) headers['X-HTTP-Method-Override'] = method;

  const controller = timeoutMs ? new AbortController() : undefined;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : undefined;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: wireMethod,
      headers,
      body:
        effectiveBody === undefined
          ? undefined
          : isMultipart
            ? (effectiveBody as FormData)
            : JSON.stringify(effectiveBody),
      signal: controller?.signal,
    });
  } catch (err) {
    if (controller?.signal.aborted) {
      throw new ApiError('La operación tardó demasiado y no se confirmó.', TIMEOUT_STATUS);
    }
    // Network/connectivity failure (no response from server). The underlying
    // reason is the only clue when an upload fails, so surface it in dev instead
    // of swallowing it — users still get the friendly message in production.
    const reason = err instanceof Error ? err.message : String(err);
    if (__DEV__) console.warn(`[api] ${method} ${path} → network failure:`, reason);
    throw new ApiError(
      __DEV__
        ? `No se pudo conectar con el servidor. (${reason})`
        : 'No se pudo conectar con el servidor. Revisa tu conexión.',
      0
    );
  } finally {
    if (timer) clearTimeout(timer);
  }

  // Some responses (e.g. logout) may have an empty body.
  const text = await response.text();
  let data: any = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      // Non-JSON response — typically an HTML error page from a WAF/proxy.
      throw new ApiError(
        response.ok
          ? 'El servidor devolvió una respuesta inválida.'
          : `El servidor rechazó la solicitud (${response.status}).`,
        response.status
      );
    }
  }

  if (!response.ok) {
    // A 401 on a request that used the stored session token means the token was
    // revoked/expired → trigger the global sign-out so the app returns to login.
    // (Login/me/logout pass an explicit token, so a bad-credentials 401 there
    // won't bounce anyone.)
    if (response.status === 401 && usesSessionToken) notifyUnauthorized();
    throw new ApiError(extractMessage(data, response.status), response.status, data?.errors);
  }

  return data as T;
}
