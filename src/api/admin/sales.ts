import { apiRequest } from '../client';
import type { PaginationMeta } from '../products';
import type { CancelResult, SaleSortBy, SortDir } from '../sales';
import type {
  AdminSaleDetail,
  AdminSaleSummary,
  PaymentMethod,
  SaleItem,
} from '../../types';

// ---- Raw shapes (snake_case + string decimals) ----

type RawUserRef = { id: number; name: string } | null;
type RawBranchRef = { id: number; name: string } | null;

type RawAdminSaleRow = {
  id: number;
  customer_name: string;
  subtotal: string;
  discount: string;
  total: string;
  payment_method: PaymentMethod;
  notes: string | null;
  items_count: number;
  created_at: string;
  deleted_at?: string | null;
  seller: RawUserRef;
  branch: RawBranchRef;
};

type RawAdminSaleItem = {
  id: number;
  product_id: number;
  product_variation_id: number | null;
  product_code: string;
  product_name: string;
  unit_price: string;
  quantity: number;
  subtotal: string;
};

type RawAdminSaleDetail = {
  id: number;
  customer_name: string;
  subtotal: string;
  discount: string;
  total: string;
  payment_method: PaymentMethod;
  notes: string | null;
  // Σ of the item quantities, served — same shape as in the list row.
  items_count: number;
  created_at: string;
  deleted_at?: string | null;
  seller: RawUserRef;
  branch: RawBranchRef;
  items: RawAdminSaleItem[];
};

// ---- Mappers ----

function mapRow(r: RawAdminSaleRow): AdminSaleSummary {
  return {
    id: r.id,
    customerName: r.customer_name,
    subtotal: parseFloat(r.subtotal),
    discount: parseFloat(r.discount),
    total: parseFloat(r.total),
    paymentMethod: r.payment_method,
    notes: r.notes,
    itemsCount: r.items_count,
    createdAt: r.created_at,
    deletedAt: r.deleted_at ?? null,
    seller: r.seller ?? null,
    branch: r.branch ?? null,
  };
}

function mapItem(i: RawAdminSaleItem): SaleItem {
  return {
    id: i.id,
    productId: i.product_id,
    productVariationId: i.product_variation_id,
    productCode: i.product_code,
    productName: i.product_name,
    unitPrice: parseFloat(i.unit_price),
    quantity: i.quantity,
    subtotal: parseFloat(i.subtotal),
  };
}

function mapDetail(s: RawAdminSaleDetail): AdminSaleDetail {
  return {
    id: s.id,
    customerName: s.customer_name,
    subtotal: parseFloat(s.subtotal),
    discount: parseFloat(s.discount),
    total: parseFloat(s.total),
    paymentMethod: s.payment_method,
    notes: s.notes,
    itemsCount: s.items_count,
    createdAt: s.created_at,
    deletedAt: s.deleted_at ?? null,
    seller: s.seller ?? null,
    branch: s.branch ?? null,
    items: (s.items ?? []).map(mapItem),
  };
}

// ---- List (GET /admin/sales) ----

export type FetchAdminSalesParams = {
  search?: string;
  paymentMethod?: PaymentMethod;
  dateFrom?: string; // Y-m-d
  dateTo?: string; // Y-m-d
  branchId?: number;
  sellerId?: number;
  sortBy?: SaleSortBy;
  sortDir?: SortDir;
  page?: number;
  perPage?: number;
};

function buildQuery(params: FetchAdminSalesParams): string {
  const q = new URLSearchParams();
  if (params.search) q.set('search', params.search);
  if (params.paymentMethod) q.set('payment_method', params.paymentMethod);
  if (params.dateFrom) q.set('date_from', params.dateFrom);
  if (params.dateTo) q.set('date_to', params.dateTo);
  if (params.branchId) q.set('branch_id', String(params.branchId));
  if (params.sellerId) q.set('seller_id', String(params.sellerId));
  if (params.sortBy) q.set('sort_by', params.sortBy);
  if (params.sortDir) q.set('sort_dir', params.sortDir);
  q.set('per_page', String(params.perPage ?? 20));
  q.set('page', String(params.page ?? 1));
  return q.toString();
}

export async function fetchAdminSales(
  params: FetchAdminSalesParams = {}
): Promise<{ items: AdminSaleSummary[]; meta: PaginationMeta }> {
  const res = await apiRequest<{
    data: RawAdminSaleRow[];
    meta: { current_page: number; last_page: number; per_page: number; total: number };
  }>(`/admin/sales?${buildQuery(params)}`);

  return {
    items: res.data.map(mapRow),
    meta: {
      currentPage: res.meta.current_page,
      lastPage: res.meta.last_page,
      perPage: res.meta.per_page,
      total: res.meta.total,
    },
  };
}

// ---- Detail (GET /admin/sales/{id}) ----

export async function fetchAdminSaleDetail(id: number): Promise<AdminSaleDetail> {
  const res = await apiRequest<{ sale: RawAdminSaleDetail }>(`/admin/sales/${id}`);
  return mapDetail(res.sale);
}

// Fetch one sale and return it as a list-row summary. Used to search the history
// by exact sale number, since the list `search` only matches the customer name.
export async function fetchAdminSaleSummaryById(id: number): Promise<AdminSaleSummary> {
  const d = await fetchAdminSaleDetail(id);
  return {
    id: d.id,
    customerName: d.customerName,
    subtotal: d.subtotal,
    discount: d.discount,
    total: d.total,
    paymentMethod: d.paymentMethod,
    notes: d.notes,
    itemsCount: d.itemsCount,
    createdAt: d.createdAt,
    deletedAt: d.deletedAt,
    seller: d.seller,
    branch: d.branch,
  };
}

// ---- Cancel (DELETE /admin/sales/{id}) — cross-seller ----

export async function cancelAdminSale(id: number): Promise<CancelResult> {
  const res = await apiRequest<{
    message: string;
    sale: { id: number; deleted_at: string };
    stock: { restored: number; skipped: number };
  }>(`/admin/sales/${id}`, { method: 'DELETE' });
  return {
    message: res.message,
    restored: res.stock?.restored ?? 0,
    skipped: res.stock?.skipped ?? 0,
  };
}

// ---- Trash (GET /admin/sales/trash, /admin/sales/trash/{id}) ----

export async function fetchAdminSalesTrash(
  params: { page?: number; perPage?: number } = {}
): Promise<{ items: AdminSaleSummary[]; meta: PaginationMeta }> {
  const q = new URLSearchParams();
  q.set('per_page', String(params.perPage ?? 20));
  q.set('page', String(params.page ?? 1));

  const res = await apiRequest<{
    data: RawAdminSaleRow[];
    meta: { current_page: number; last_page: number; per_page: number; total: number };
  }>(`/admin/sales/trash?${q.toString()}`);

  return {
    items: res.data.map(mapRow),
    meta: {
      currentPage: res.meta.current_page,
      lastPage: res.meta.last_page,
      perPage: res.meta.per_page,
      total: res.meta.total,
    },
  };
}

export async function fetchAdminTrashDetail(id: number): Promise<AdminSaleDetail> {
  const res = await apiRequest<{ sale: RawAdminSaleDetail }>(`/admin/sales/trash/${id}`);
  return mapDetail(res.sale);
}
