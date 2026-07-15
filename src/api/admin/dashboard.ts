import { apiRequest } from '../client';
import type { AdminDashboard, PaymentMethod, StatsPeriod } from '../../types';

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
    image_thumb_url?: string | null;
  }[];
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
      image_thumb_url?: string | null;
      branch_id: number;
      branch_name: string;
      stock: number;
    }[];
    has_more?: boolean;
  };
};

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

  return {
    period: res.period,
    summary: {
      totalSales: parseFloat(res.summary.total_sales),
      salesCount: res.summary.sales_count,
      itemsSold: res.summary.items_sold,
      averageTicket: parseFloat(res.summary.average_ticket),
    },
    topProducts: (res.top_products ?? []).map((p) => ({
      productId: p.product_id,
      variationId: p.product_variation_id,
      variationLabel: p.variation_label,
      name: p.name,
      quantitySold: p.quantity_sold,
      total: parseFloat(p.total),
      imageUrl: p.image_url ?? null,
      imageThumbUrl: p.image_thumb_url ?? p.image_url ?? null,
    })),
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
      products: (res.low_stock?.products ?? []).map((p) => ({
        productId: p.product_id,
        productCode: p.product_code,
        productName: p.product_name,
        productType: p.product_type,
        imageUrl: p.image_url ?? null,
        imageThumbUrl: p.image_thumb_url ?? p.image_url ?? null,
        branchId: p.branch_id,
        branchName: p.branch_name,
        stock: p.stock,
      })),
      hasMore: res.low_stock?.has_more ?? false,
    },
  };
}
