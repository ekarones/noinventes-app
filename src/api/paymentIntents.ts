import { apiRequest } from './client';
import type {
  AdminPaymentIntent,
  PaymentIntentConfig,
  PaymentIntentMethod,
  PaymentIntentStatus,
} from '../types';

// Seller-side payment intents for the POS "cobro con link" flow. Same shapes as
// the admin endpoints (src/api/admin/paymentIntents.ts) but mounted WITHOUT the
// /admin prefix — the seller token is rejected (403) on the admin routes, so the
// backend exposes these under seller-api. The seller only creates / polls /
// cancels its own intents; the global history stays admin-only.
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

// GET /payment-intents/config — tells whether this tenant has Culqi configured,
// so the POS can hide/disable the "cobro con link" option when it can't work.
export async function fetchPaymentIntentConfig(): Promise<PaymentIntentConfig> {
  const res = await apiRequest<{
    config: {
      public_key: string | null;
      configured?: boolean;
      currency: string;
      min_amount_cents: number;
      payment_url_template: string | null;
    };
  }>('/payment-intents/config');
  const c = res.config;
  return {
    publicKey: c.public_key ?? null,
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
  method?: PaymentIntentMethod | null;
  expiresHours?: number;
};

// POST /payment-intents — creates the intent + shareable URL for a sale total.
export async function createPaymentIntent(
  payload: CreatePaymentIntentPayload
): Promise<AdminPaymentIntent> {
  const res = await apiRequest<{ intent: RawIntent }>('/payment-intents', {
    method: 'POST',
    body: {
      amount: payload.amount.toFixed(2),
      email: payload.email || null,
      description: payload.description || null,
      method: payload.method ?? null,
      expires_hours: payload.expiresHours,
    },
  });
  return mapIntent(res.intent);
}

// GET /payment-intents/{id} — polled every ~4s by the status screen.
export async function fetchPaymentIntent(id: number): Promise<AdminPaymentIntent> {
  const res = await apiRequest<{ intent: RawIntent }>(`/payment-intents/${id}`);
  return mapIntent(res.intent);
}

// DELETE /payment-intents/{id} — cancels a "pending" intent (409 if terminal).
export async function cancelPaymentIntent(id: number): Promise<void> {
  await apiRequest(`/payment-intents/${id}`, { method: 'DELETE' });
}
