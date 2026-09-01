import { apiRequest } from '../client';
import { mapMeta } from '../products';
import type { PaginationMeta } from '../products';
import type {
  AdminPurchaseOrderDetail,
  AdminPurchaseOrderItem,
  AdminPurchaseOrderRow,
  PurchaseOrderOptions,
  PurchaseOrderStatus,
} from '../../types';

const num = (s: string | number | null | undefined): number =>
  typeof s === 'number' ? s : parseFloat(s ?? '0') || 0;

type RawRow = {
  id: number;
  code: string;
  status: PurchaseOrderStatus;
  supplier: { id: number; display_name: string };
  branch: { id: number; name: string };
  subtotal: string;
  total: string;
  ordered_at: string | null;
  received_at: string | null;
  created_at: string;
};

function mapRow(r: RawRow): AdminPurchaseOrderRow {
  return {
    id: r.id,
    code: r.code,
    status: r.status,
    supplier: { id: r.supplier.id, displayName: r.supplier.display_name },
    branch: { id: r.branch.id, name: r.branch.name },
    subtotal: num(r.subtotal),
    total: num(r.total),
    orderedAt: r.ordered_at ?? null,
    receivedAt: r.received_at ?? null,
    createdAt: r.created_at,
  };
}

type RawItem = {
  id: number;
  product_id: number | null;
  product_variation_id: number | null;
  label: string;
  quantity: number;
  unit_cost: string;
  subtotal: string;
};

function mapItem(i: RawItem): AdminPurchaseOrderItem {
  return {
    id: i.id,
    productId: i.product_id ?? null,
    productVariationId: i.product_variation_id ?? null,
    label: i.label,
    quantity: i.quantity,
    unitCost: num(i.unit_cost),
    subtotal: num(i.subtotal),
  };
}

type RawDetail = {
  id: number;
  code: string;
  status: PurchaseOrderStatus;
  supplier: {
    id: number;
    ruc: string;
    razon_social: string;
    nombre_comercial: string | null;
    display_name: string;
    contact_name: string | null;
    email: string | null;
    phone: string | null;
  };
  branch: { id: number; name: string };
  subtotal: string;
  total: string;
  notes: string | null;
  ordered_at: string | null;
  received_at: string | null;
  created_at: string;
  items: RawItem[];
  can_edit: boolean;
  can_send: boolean;
  can_receive: boolean;
  can_cancel: boolean;
  can_delete: boolean;
};

function mapDetail(o: RawDetail): AdminPurchaseOrderDetail {
  return {
    id: o.id,
    code: o.code,
    status: o.status,
    supplier: {
      id: o.supplier.id,
      ruc: o.supplier.ruc,
      razonSocial: o.supplier.razon_social,
      nombreComercial: o.supplier.nombre_comercial ?? null,
      displayName: o.supplier.display_name,
      contactName: o.supplier.contact_name ?? null,
      email: o.supplier.email ?? null,
      phone: o.supplier.phone ?? null,
    },
    branch: { id: o.branch.id, name: o.branch.name },
    subtotal: num(o.subtotal),
    total: num(o.total),
    notes: o.notes ?? null,
    orderedAt: o.ordered_at ?? null,
    receivedAt: o.received_at ?? null,
    createdAt: o.created_at,
    items: o.items.map(mapItem),
    can: {
      edit: o.can_edit,
      send: o.can_send,
      receive: o.can_receive,
      cancel: o.can_cancel,
      delete: o.can_delete,
    },
  };
}

export type FetchPurchaseOrdersParams = {
  status?: PurchaseOrderStatus | 'all';
  page?: number;
  perPage?: number;
};

// GET /admin/purchase-orders — paginated, newest first. Optional status filter.
export async function fetchPurchaseOrders(
  params: FetchPurchaseOrdersParams = {}
): Promise<{ items: AdminPurchaseOrderRow[]; meta: PaginationMeta }> {
  const q = new URLSearchParams();
  if (params.status && params.status !== 'all') q.set('status', params.status);
  q.set('per_page', String(params.perPage ?? 20));
  q.set('page', String(params.page ?? 1));

  const res = await apiRequest<{
    data: RawRow[];
    meta: { current_page: number; last_page: number; per_page: number; total: number };
  }>(`/admin/purchase-orders?${q.toString()}`);

  return { items: res.data.map(mapRow), meta: mapMeta(res.meta) };
}

// GET /admin/purchase-orders/options — suppliers + branches + pickables in one
// request, so the "new order" form doesn't fire three fetches.
export async function fetchPurchaseOrderOptions(): Promise<PurchaseOrderOptions> {
  const res = await apiRequest<{
    suppliers: { id: number; ruc: string; display_name: string }[];
    branches: { id: number; name: string }[];
    pickables: {
      product_id: number | null;
      product_variation_id: number | null;
      code: string;
      label: string;
    }[];
  }>(`/admin/purchase-orders/options`);

  return {
    suppliers: res.suppliers.map((s) => ({ id: s.id, ruc: s.ruc, displayName: s.display_name })),
    branches: res.branches.map((b) => ({ id: b.id, name: b.name })),
    pickables: res.pickables.map((p) => ({
      productId: p.product_id ?? null,
      productVariationId: p.product_variation_id ?? null,
      code: p.code,
      label: p.label,
    })),
  };
}

// GET /admin/purchase-orders/{id} — full detail with items + can_* flags.
export async function fetchPurchaseOrder(id: number): Promise<AdminPurchaseOrderDetail> {
  const res = await apiRequest<{ order: RawDetail }>(`/admin/purchase-orders/${id}`);
  return mapDetail(res.order);
}

export type PurchaseOrderItemInput = {
  productId: number | null;
  productVariationId: number | null;
  quantity: number;
  unitCost: number;
};

export type PurchaseOrderPayload = {
  supplierId: number;
  branchId: number;
  notes?: string | null;
  items: PurchaseOrderItemInput[];
};

function body(p: PurchaseOrderPayload) {
  return {
    supplier_id: p.supplierId,
    branch_id: p.branchId,
    notes: p.notes || null,
    items: p.items.map((it) => ({
      // Exactly one of product_id / product_variation_id (server rejects both/none).
      ...(it.productVariationId != null
        ? { product_variation_id: it.productVariationId }
        : { product_id: it.productId }),
      quantity: it.quantity,
      unit_cost: it.unitCost.toFixed(2),
    })),
  };
}

// POST /admin/purchase-orders — creates a draft; `code` is server-generated.
export async function createPurchaseOrder(
  payload: PurchaseOrderPayload
): Promise<AdminPurchaseOrderDetail> {
  const res = await apiRequest<{ order: RawDetail }>(`/admin/purchase-orders`, {
    method: 'POST',
    body: body(payload),
  });
  return mapDetail(res.order);
}

// PUT /admin/purchase-orders/{id} — draft only (403 otherwise). Items replace.
export async function updatePurchaseOrder(
  id: number,
  payload: PurchaseOrderPayload
): Promise<void> {
  await apiRequest(`/admin/purchase-orders/${id}`, { method: 'PUT', body: body(payload) });
}

// DELETE /admin/purchase-orders/{id} — draft only (422 otherwise).
export async function deletePurchaseOrder(id: number): Promise<void> {
  await apiRequest(`/admin/purchase-orders/${id}`, { method: 'DELETE' });
}

// draft → ordered. 422 if the order isn't a draft or has no items.
export async function sendPurchaseOrder(id: number): Promise<void> {
  await apiRequest(`/admin/purchase-orders/${id}/send`, { method: 'POST' });
}

// ordered → received: adds stock to the branch + logs a stock movement, atomically.
export async function receivePurchaseOrder(id: number): Promise<void> {
  await apiRequest(`/admin/purchase-orders/${id}/receive`, { method: 'POST' });
}

// draft | ordered → cancelled. No stock effect.
export async function cancelPurchaseOrder(id: number): Promise<void> {
  await apiRequest(`/admin/purchase-orders/${id}/cancel`, { method: 'POST' });
}
