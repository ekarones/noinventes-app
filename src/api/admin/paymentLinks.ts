import { apiRequest } from '../client';
import { mapMeta } from '../products';
import type { PaginationMeta } from '../products';
import type { AdminPaymentLink, PaymentLinkMethod, PaymentLinkStatus } from '../../types';

// Raw shape from the payment-links endpoints (snake_case + string amount, same
// convention as the rest of the API — see api-mobile.md).
type RawPaymentLink = {
  id: number;
  culqi_link_id: string;
  url: string;
  title: string;
  description: string | null;
  amount: string;
  currency: string;
  status: PaymentLinkStatus;
  methods: PaymentLinkMethod[];
  charge_id: string | null;
  paid_at: string | null;
  created_at: string;
  expiration_at: string | null;
};

function mapPaymentLink(p: RawPaymentLink): AdminPaymentLink {
  return {
    id: p.id,
    culqiLinkId: p.culqi_link_id,
    url: p.url,
    title: p.title,
    description: p.description ?? null,
    amount: parseFloat(p.amount),
    currency: p.currency,
    status: p.status,
    methods: p.methods ?? [],
    chargeId: p.charge_id ?? null,
    paidAt: p.paid_at ?? null,
    createdAt: p.created_at,
    expirationAt: p.expiration_at ?? null,
  };
}

export type CreatePaymentLinkPayload = {
  amount: number;
  title: string;
  description?: string | null;
  methods?: PaymentLinkMethod[];
  expirationHours?: number;
};

// POST /admin/payment-links — crea el link contra Culqi y el registro local.
// 422 si el monto está debajo del mínimo de Culqi o el título viene vacío.
export async function createPaymentLink(payload: CreatePaymentLinkPayload): Promise<AdminPaymentLink> {
  const res = await apiRequest<{ payment_link: RawPaymentLink }>('/admin/payment-links', {
    method: 'POST',
    body: {
      amount: payload.amount.toFixed(2),
      title: payload.title,
      description: payload.description || null,
      methods: payload.methods,
      expiration_hours: payload.expirationHours,
    },
  });
  return mapPaymentLink(res.payment_link);
}

// GET /admin/payment-links/{id} — estado del link; la pantalla de cobro hace
// polling de esto cada ~4s mientras sigue "pending".
export async function fetchPaymentLink(id: number): Promise<AdminPaymentLink> {
  const res = await apiRequest<{ payment_link: RawPaymentLink }>(`/admin/payment-links/${id}`);
  return mapPaymentLink(res.payment_link);
}

export type FetchPaymentLinksParams = {
  status?: PaymentLinkStatus | 'all';
  page?: number;
  perPage?: number;
};

// GET /admin/payment-links — historial paginado.
export async function fetchPaymentLinks(
  params: FetchPaymentLinksParams = {}
): Promise<{ items: AdminPaymentLink[]; meta: PaginationMeta }> {
  const q = new URLSearchParams();
  if (params.status && params.status !== 'all') q.set('status', params.status);
  q.set('per_page', String(params.perPage ?? 20));
  q.set('page', String(params.page ?? 1));

  const res = await apiRequest<{
    data: RawPaymentLink[];
    meta: { current_page: number; last_page: number; per_page: number; total: number };
  }>(`/admin/payment-links?${q.toString()}`);

  return { items: res.data.map(mapPaymentLink), meta: mapMeta(res.meta) };
}

// DELETE /admin/payment-links/{id} — anula un link "pending". 422 si ya está paid.
export async function cancelPaymentLink(id: number): Promise<void> {
  await apiRequest(`/admin/payment-links/${id}`, { method: 'DELETE' });
}
