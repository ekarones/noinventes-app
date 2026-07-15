import { apiRequest } from './client';
import type { PaginationMeta } from './products';
import type {
  DashboardStats,
  PaymentMethod,
  SaleDetail,
  SaleItem,
  SaleSummary,
  StatsPeriod,
} from '../types';

// ---- Create sale (POST /sales) ----

export type CreateSaleItem = {
  product_id: number;
  product_variation_id?: number;
  quantity: number;
};

export type CreateSalePayload = {
  customer_name: string;
  payment_method: PaymentMethod;
  discount?: number;
  notes?: string;
  items: CreateSaleItem[];
};

type RawSaleFull = {
  id: number;
  customer_name: string;
  subtotal: string;
  discount: string;
  total: string;
  payment_method: PaymentMethod;
  notes: string | null;
  created_at: string;
  items: { quantity: number }[];
};

function summaryFromFull(s: RawSaleFull): SaleSummary {
  return {
    id: s.id,
    customerName: s.customer_name,
    subtotal: parseFloat(s.subtotal),
    discount: parseFloat(s.discount),
    total: parseFloat(s.total),
    paymentMethod: s.payment_method,
    notes: s.notes,
    itemsCount: s.items.reduce((n, i) => n + i.quantity, 0),
    createdAt: s.created_at,
  };
}

// POST /sales — creates an atomic sale. 30s timeout because the endpoint is NOT
// idempotent (see checkout for the "unknown state" handling on timeout).
export async function createSale(payload: CreateSalePayload): Promise<SaleSummary> {
  const res = await apiRequest<{ sale: RawSaleFull }>('/sales', {
    method: 'POST',
    body: payload,
    timeoutMs: 30000,
  });
  return summaryFromFull(res.sale);
}

// ---- Sales history (GET /sales) ----

type RawSaleRow = {
  id: number;
  customer_name: string;
  subtotal: string;
  discount: string;
  total: string;
  payment_method: PaymentMethod;
  notes: string | null;
  items_count: number;
  created_at: string;
};

function mapRow(r: RawSaleRow): SaleSummary {
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
  };
}

// ---- Sale detail (GET /sales/{id}) ----

type RawSaleItem = {
  id: number;
  product_id: number;
  product_variation_id: number | null;
  product_code: string;
  product_name: string;
  unit_price: string;
  quantity: number;
  subtotal: string;
};

type RawSaleDetail = {
  id: number;
  customer_name: string;
  subtotal: string;
  discount: string;
  total: string;
  payment_method: PaymentMethod;
  notes: string | null;
  created_at: string;
  branch: { id: number; name: string } | null;
  items: RawSaleItem[];
};

function mapItem(i: RawSaleItem): SaleItem {
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

export async function fetchSaleDetail(id: number): Promise<SaleDetail> {
  const res = await apiRequest<{ sale: RawSaleDetail }>(`/sales/${id}`);
  const s = res.sale;
  return {
    id: s.id,
    customerName: s.customer_name,
    subtotal: parseFloat(s.subtotal),
    discount: parseFloat(s.discount),
    total: parseFloat(s.total),
    paymentMethod: s.payment_method,
    notes: s.notes,
    createdAt: s.created_at,
    branch: s.branch,
    items: s.items.map(mapItem),
  };
}

// Fetches a single sale and returns it as a list-row summary. Used to search
// the history by exact sale number, since the list `search` param only matches
// the customer name (not the id).
export async function fetchSaleSummaryById(id: number): Promise<SaleSummary> {
  const d = await fetchSaleDetail(id);
  return {
    id: d.id,
    customerName: d.customerName,
    subtotal: d.subtotal,
    discount: d.discount,
    total: d.total,
    paymentMethod: d.paymentMethod,
    notes: d.notes,
    itemsCount: d.items.reduce((n, i) => n + i.quantity, 0),
    createdAt: d.createdAt,
  };
}

// ---- Cancel sale (POST /sales/{id}/cancel) ----

export type CancelResult = {
  message: string;
  restored: number; // items whose stock returned to inventory
  skipped: number; // items whose product/variation no longer exists
};

export async function cancelSale(id: number): Promise<CancelResult> {
  const res = await apiRequest<{
    message: string;
    sale: { id: number; cancelled_at: string };
    stock: { restored: number; skipped: number };
  }>(`/sales/${id}/cancel`, { method: 'POST' });
  return {
    message: res.message,
    restored: res.stock?.restored ?? 0,
    skipped: res.stock?.skipped ?? 0,
  };
}

export type SaleSortBy = 'id' | 'created_at' | 'customer_name' | 'total';
export type SortDir = 'asc' | 'desc';

export type FetchSalesParams = {
  search?: string;
  paymentMethod?: PaymentMethod;
  dateFrom?: string; // Y-m-d
  dateTo?: string; // Y-m-d
  sortBy?: SaleSortBy;
  sortDir?: SortDir;
  page?: number;
  perPage?: number;
};

export async function fetchSales(
  params: FetchSalesParams = {}
): Promise<{ items: SaleSummary[]; meta: PaginationMeta }> {
  const q = new URLSearchParams();
  if (params.search) q.set('search', params.search);
  if (params.paymentMethod) q.set('payment_method', params.paymentMethod);
  if (params.dateFrom) q.set('date_from', params.dateFrom);
  if (params.dateTo) q.set('date_to', params.dateTo);
  if (params.sortBy) q.set('sort_by', params.sortBy);
  if (params.sortDir) q.set('sort_dir', params.sortDir);
  q.set('per_page', String(params.perPage ?? 20));
  q.set('page', String(params.page ?? 1));

  const res = await apiRequest<{
    data: RawSaleRow[];
    meta: { current_page: number; last_page: number; per_page: number; total: number };
  }>(`/sales?${q.toString()}`);

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

// ---- Statistics (GET /sales/statistics) ----

type RawStats = {
  period: StatsPeriod;
  summary: {
    total_sales: string;
    sales_count: number;
    items_sold: number;
    average_ticket: string;
  };
  // Grouped by (product_id, product_variation_id): a variable product that sold
  // two combinations ranks as two rows, not one. `name` is the parent's clean
  // name and the images point at the variation when it has its own.
  top_products: {
    product_id: number;
    product_variation_id: number | null; // null = simple product
    variation_label: string | null; // "Rojo · M", null for a simple product
    name: string;
    quantity_sold: number;
    total: string;
    image_url: string | null;
    image_thumb_url?: string | null;
  }[];
  recent_sales: {
    id: number;
    customer_name: string;
    total: string;
    payment_method: PaymentMethod;
    items_count: number;
    created_at: string;
  }[];
};

export async function fetchStatistics(period: StatsPeriod): Promise<DashboardStats> {
  const res = await apiRequest<RawStats>(`/sales/statistics?period=${period}`);
  return {
    period: res.period,
    summary: {
      totalSales: parseFloat(res.summary.total_sales),
      salesCount: res.summary.sales_count,
      itemsSold: res.summary.items_sold,
      averageTicket: parseFloat(res.summary.average_ticket),
    },
    topProducts: res.top_products.map((p) => ({
      productId: p.product_id,
      variationId: p.product_variation_id,
      variationLabel: p.variation_label,
      name: p.name,
      quantitySold: p.quantity_sold,
      total: parseFloat(p.total),
      imageUrl: p.image_url ?? null,
      imageThumbUrl: p.image_thumb_url ?? p.image_url ?? null,
    })),
    recentSales: res.recent_sales.map((s) => ({
      id: s.id,
      customerName: s.customer_name,
      total: parseFloat(s.total),
      paymentMethod: s.payment_method,
      itemsCount: s.items_count,
      createdAt: s.created_at,
    })),
  };
}
