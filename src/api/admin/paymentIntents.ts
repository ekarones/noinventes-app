import { apiRequest } from '../client';
import { mapMeta } from '../products';
import type { PaginationMeta } from '../products';
import type {
  AdminPaymentIntent,
  PaymentIntentConfig,
  PaymentIntentMethod,
  PaymentIntentStatus,
} from '../../types';

// Raw shape from the payment-intents endpoints (snake_case, amount as céntimos
// int + a formatted string — see api-mobile.md § "Pagos Culqi — host-and-share").
type RawIntent = {
  id: number;
  public_uuid: string;
  url: string;
  amount_cents: number;
  amount_formatted: string;
  currency: string;
  installments: number;
  email: string | null;
  description: string | null;
  method: PaymentIntentMethod | null;
  status: PaymentIntentStatus;
  expires_at: string | null;
  paid_at: string | null;
  culqi_charge_id: string | null;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
};

function mapIntent(i: RawIntent): AdminPaymentIntent {
  return {
    id: i.id,
    publicUuid: i.public_uuid,
    url: i.url,
    amount: parseFloat(i.amount_formatted),
    amountCents: i.amount_cents,
    currency: i.currency,
    installments: i.installments ?? 0,
    email: i.email ?? null,
    description: i.description ?? null,
    method: i.method ?? null,
    status: i.status,
    expiresAt: i.expires_at ?? null,
    paidAt: i.paid_at ?? null,
    culqiChargeId: i.culqi_charge_id ?? null,
    errorCode: i.error_code ?? null,
    errorMessage: i.error_message ?? null,
    createdAt: i.created_at,
  };
}

// GET /admin/payment-intents/config — public key + limits for the active tenant.
// `publicKey` is null when the tenant hasn't connected a Culqi account.
export async function fetchPaymentIntentConfig(): Promise<PaymentIntentConfig> {
  const res = await apiRequest<{
    config: {
      public_key: string | null;
      configured?: boolean;
      currency: string;
      min_amount_cents: number;
      payment_url_template: string | null;
    };
  }>('/admin/payment-intents/config');
  const c = res.config;
  return {
    publicKey: c.public_key ?? null,
    // Fall back to "has a public key" for older backends without the flag.
    configured: c.configured ?? c.public_key != null,
    currency: c.currency ?? 'PEN',
    minAmountCents: c.min_amount_cents ?? 0,
    paymentUrlTemplate: c.payment_url_template ?? null,
  };
}

export type CreatePaymentIntentPayload = {
  amount: number;
  email?: string | null;
  description?: string | null;
  // null / omitted = page offers both card and Yape.
  method?: PaymentIntentMethod | null;
  installments?: number;
  expiresHours?: number;
};

// POST /admin/payment-intents — creates the intent and its shareable URL.
// 422 if the amount is below Culqi's minimum, email invalid, etc.
export async function createPaymentIntent(
  payload: CreatePaymentIntentPayload
): Promise<AdminPaymentIntent> {
  const res = await apiRequest<{ intent: RawIntent }>('/admin/payment-intents', {
    method: 'POST',
    body: {
      amount: payload.amount.toFixed(2),
      email: payload.email || null,
      description: payload.description || null,
      method: payload.method ?? null,
      installments: payload.installments ?? 0,
      expires_hours: payload.expiresHours,
    },
  });
  return mapIntent(res.intent);
}

// GET /admin/payment-intents/{id} — the status screen polls this every ~4s while
// the intent is "pending". The server lazily expires stale intents on read.
export async function fetchPaymentIntent(id: number): Promise<AdminPaymentIntent> {
  const res = await apiRequest<{ intent: RawIntent }>(`/admin/payment-intents/${id}`);
  return mapIntent(res.intent);
}

export type FetchPaymentIntentsParams = {
  status?: PaymentIntentStatus | 'all';
  search?: string;
  page?: number;
  perPage?: number;
};

// GET /admin/payment-intents — paginated history (created_at DESC).
export async function fetchPaymentIntents(
  params: FetchPaymentIntentsParams = {}
): Promise<{ items: AdminPaymentIntent[]; meta: PaginationMeta }> {
  const q = new URLSearchParams();
  if (params.status && params.status !== 'all') q.set('status', params.status);
  if (params.search) q.set('search', params.search);
  q.set('per_page', String(params.perPage ?? 20));
  q.set('page', String(params.page ?? 1));

  const res = await apiRequest<{
    data: RawIntent[];
    meta: { current_page: number; last_page: number; per_page: number; total: number };
  }>(`/admin/payment-intents?${q.toString()}`);

  return { items: res.data.map(mapIntent), meta: mapMeta(res.meta) };
}

// DELETE /admin/payment-intents/{id} — cancels a "pending" intent. 409 if it is
// already in a terminal state (message explains).
export async function cancelPaymentIntent(id: number): Promise<void> {
  await apiRequest(`/admin/payment-intents/${id}`, { method: 'DELETE' });
}
