import { apiRequest } from '../client';
import { mapMeta } from '../products';
import { mapTopProduct } from '../sales';
import type { PaginationMeta } from '../products';
import type {
  AdminDashboard,
  DashboardTopProduct,
  DashboardTopSupplier,
  LowStockItem,
  PaymentMethod,
  StatsPeriod,
} from '../../types';

// Raw shape from GET /admin/dashboard (snake_case + string decimals).
type RawAdminDashboard = {
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
    variation_label: string | null; // "Blanco · M", null for a simple product
    name: string;
    quantity_sold: number;
    total: string;
    image_url: string | null;
    image_thumb_url: string | null;
  }[];
  // Says whether the inline top 5 is the whole ranking or there is more to page
  // through via /admin/dashboard/top-products.
  top_products_meta?: { total: number; has_more: boolean; limit: number };
  sales_by_branch: {
    branch_id: number;
    branch_name: string;
    sales_count: number;
    total: string;
  }[];
  sales_by_seller: {
    seller_id: number;
    seller_name: string;
    sales_count: number;
    total: string;
  }[];
  recent_sales: {
    id: number;
    customer_name: string;
    total: string;
    payment_method: PaymentMethod;
    seller: { id: number; name: string } | null;
    branch: { id: number; name: string } | null;
    items_count: number;
    created_at: string;
  }[];
  low_stock: {
    threshold: number;
    count: number;
    products?: {
      product_id: number;
      product_code: string;
      product_name: string;
      product_type: 'simple' | 'variable';
      image_url: string | null;
      image_thumb_url: string | null;
      branch_id: number;
      branch_name: string;
      stock: number;
    }[];
    has_more?: boolean;
  };
  // Purchasing block. Optional/defensive for an older API build without it.
  purchases?: {
    period_total: string;
    received_count: number;
    pending_orders_count: number;
    pending_orders_value: string;
    draft_count: number;
    top_suppliers?: {
      supplier_id: number;
      display_name: string;
      orders_count: number;
      total: string;
    }[];
    top_suppliers_meta?: { total: number; has_more: boolean; limit: number };
  };
};

// Both the inline blocks and their paginated endpoints return the same rows, so
// the mappers are shared.
type RawTopProduct = RawAdminDashboard['top_products'][number];
type RawLowStockItem = NonNullable<RawAdminDashboard['low_stock']['products']>[number];
type RawTopSupplier = NonNullable<NonNullable<RawAdminDashboard['purchases']>['top_suppliers']>[number];

function mapTopSupplier(s: RawTopSupplier): DashboardTopSupplier {
  return {
    supplierId: s.supplier_id,
    displayName: s.display_name,
    ordersCount: s.orders_count,
    total: parseFloat(s.total),
  };
}

function mapLowStockItem(p: RawLowStockItem): LowStockItem {
  return {
    productId: p.product_id,
    productCode: p.product_code,
    productName: p.product_name,
    productType: p.product_type,
    imageUrl: p.image_url ?? null,
    imageThumbUrl: p.image_thumb_url,
    branchId: p.branch_id,
    branchName: p.branch_name,
    stock: p.stock,
  };
}

// GET /admin/dashboard — global KPIs for admins (admin-api gated). When
// `branchId` is given, every metric is scoped to that branch and the server
// returns `sales_by_branch` empty (a 1-row breakdown is pointless).
export async function fetchAdminDashboard(
  period: StatsPeriod,
  branchId?: number | null
): Promise<AdminDashboard> {
  const q = new URLSearchParams();
  q.set('period', period);
  if (branchId) q.set('branch_id', String(branchId));

  const res = await apiRequest<RawAdminDashboard>(`/admin/dashboard?${q.toString()}`);
  const topProducts = (res.top_products ?? []).map(mapTopProduct);

  return {
    period: res.period,
    summary: {
      totalSales: parseFloat(res.summary.total_sales),
      salesCount: res.summary.sales_count,
      itemsSold: res.summary.items_sold,
      averageTicket: parseFloat(res.summary.average_ticket),
    },
    topProducts,
    // An older API build without the field: assume what we got is all there is.
    topProductsMeta: {
      total: res.top_products_meta?.total ?? topProducts.length,
      hasMore: res.top_products_meta?.has_more ?? false,
      limit: res.top_products_meta?.limit ?? topProducts.length,
    },
    salesByBranch: (res.sales_by_branch ?? []).map((b) => ({
      branchId: b.branch_id,
      branchName: b.branch_name,
      salesCount: b.sales_count,
      total: parseFloat(b.total),
    })),
    salesBySeller: (res.sales_by_seller ?? []).map((s) => ({
      sellerId: s.seller_id,
      sellerName: s.seller_name,
      salesCount: s.sales_count,
      total: parseFloat(s.total),
    })),
    recentSales: (res.recent_sales ?? []).map((s) => ({
      id: s.id,
      customerName: s.customer_name,
      total: parseFloat(s.total),
      paymentMethod: s.payment_method,
      seller: s.seller ?? null,
      branch: s.branch ?? null,
      itemsCount: s.items_count,
      createdAt: s.created_at,
    })),
    lowStock: {
      threshold: res.low_stock?.threshold ?? 0,
      count: res.low_stock?.count ?? 0,
      products: (res.low_stock?.products ?? []).map(mapLowStockItem),
      hasMore: res.low_stock?.has_more ?? false,
    },
    purchases: (() => {
      const topSuppliers = (res.purchases?.top_suppliers ?? []).map(mapTopSupplier);
      return {
        periodTotal: parseFloat(res.purchases?.period_total ?? '0'),
        receivedCount: res.purchases?.received_count ?? 0,
        pendingOrdersCount: res.purchases?.pending_orders_count ?? 0,
        pendingOrdersValue: parseFloat(res.purchases?.pending_orders_value ?? '0'),
        draftCount: res.purchases?.draft_count ?? 0,
        topSuppliers,
        topSuppliersMeta: {
          total: res.purchases?.top_suppliers_meta?.total ?? topSuppliers.length,
          hasMore: res.purchases?.top_suppliers_meta?.has_more ?? false,
          limit: res.purchases?.top_suppliers_meta?.limit ?? topSuppliers.length,
        },
      };
    })(),
  };
}

// GET /admin/dashboard/top-products — the full cross-seller ranking for the
// period, paged. Backs the dashboard's "Ver todas"; honours `branchId` so the
// list matches whatever scope the dashboard is showing.
export async function fetchAdminTopProducts(
  period: StatsPeriod,
  branchId: number | null | undefined,
  page = 1,
  perPage = 20
): Promise<{ items: DashboardTopProduct[]; meta: PaginationMeta }> {
  const q = new URLSearchParams();
  q.set('period', period);
  if (branchId) q.set('branch_id', String(branchId));
  q.set('page', String(page));
  q.set('per_page', String(perPage));

  const res = await apiRequest<{
    data: RawTopProduct[];
    meta: { current_page: number; last_page: number; per_page: number; total: number };
  }>(`/admin/dashboard/top-products?${q.toString()}`);

  return {
    items: res.data.map(mapTopProduct),
    meta: mapMeta(res.meta),
  };
}

// GET /admin/dashboard/low-stock — every critical (product, branch) pair, paged.
// The dashboard only inlines up to 50 of them.
export async function fetchAdminLowStock(
  branchId: number | null | undefined,
  page = 1,
  perPage = 20
): Promise<{ items: LowStockItem[]; threshold: number; meta: PaginationMeta }> {
  const q = new URLSearchParams();
  if (branchId) q.set('branch_id', String(branchId));
  q.set('page', String(page));
  q.set('per_page', String(perPage));

  const res = await apiRequest<{
    threshold: number;
    data: RawLowStockItem[];
    meta: { current_page: number; last_page: number; per_page: number; total: number };
  }>(`/admin/dashboard/low-stock?${q.toString()}`);

  return {
    items: res.data.map(mapLowStockItem),
    threshold: res.threshold,
    meta: mapMeta(res.meta),
  };
}

// GET /admin/dashboard/top-suppliers — the full supplier ranking for the period
// (Σ received-order totals), paged. Backs the dashboard's "Ver todos".
export async function fetchAdminTopSuppliers(
  period: StatsPeriod,
  branchId: number | null | undefined,
  page = 1,
  perPage = 20
): Promise<{ items: DashboardTopSupplier[]; meta: PaginationMeta }> {
  const q = new URLSearchParams();
  q.set('period', period);
  if (branchId) q.set('branch_id', String(branchId));
  q.set('page', String(page));
  q.set('per_page', String(perPage));

  const res = await apiRequest<{
    data: RawTopSupplier[];
    meta: { current_page: number; last_page: number; per_page: number; total: number };
  }>(`/admin/dashboard/top-suppliers?${q.toString()}`);

  return { items: res.data.map(mapTopSupplier), meta: mapMeta(res.meta) };
}
