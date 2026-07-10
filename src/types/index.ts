// Shared domain types. These mirror the Sellers Products API (snake_case and
// string decimals are normalized to camelCase + numbers in src/api/products.ts).

export type CategoryRef = {
  id: number;
  name: string;
};

export type Category = {
  id: number;
  parentId: number | null;
  name: string;
};

export type ProductType = 'simple' | 'variable';
export type ProductStatus = 'public' | 'published';

export type Product = {
  id: number;
  code: string;
  name: string;
  slug: string | null;
  type: ProductType;
  status: ProductStatus;
  unitValue: number;
  finalPrice: number;
  unitOfMeasure: string;
  imageUrl: string | null;
  stock: number; // stock at the seller's branch
  variationsCount: number;
  category: CategoryRef | null;
};

export type AttributeValue = {
  attribute: { id: number; name: string };
  value: string;
};

export type Variation = {
  id: number;
  code: string;
  unitValue: number;
  finalPrice: number;
  imageUrl: string | null;
  stock: number;
  attributeValues: AttributeValue[];
};

// A cart line. For variable products `variation` identifies the chosen combo;
// for simple products it's null.
export type CartItem = {
  key: string; // unique per (product, variation)
  product: Product;
  variation: Variation | null;
  quantity: number;
};

// ---- Sales ----

export type PaymentMethod = 'cash' | 'transfer' | 'yape' | 'plin' | 'pos';

// A sale row from GET /sales (list) and the result of POST /sales. The list
// endpoint returns only an item count, not the line items.
export type SaleSummary = {
  id: number;
  customerName: string;
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  notes: string | null;
  itemsCount: number;
  createdAt: string; // ISO 8601 with server timezone
};

// A single line of a sale (snapshotted at sale time). productName already
// includes the variation combo for variable products.
export type SaleItem = {
  id: number;
  productId: number;
  productVariationId: number | null;
  productCode: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
};

// Full sale with line items — from GET /sales/{id}.
export type SaleDetail = {
  id: number;
  customerName: string;
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  notes: string | null;
  createdAt: string;
  branch: { id: number; name: string } | null;
  items: SaleItem[];
};

// ---- Dashboard (GET /sales/statistics) ----

export type StatsPeriod = 'today' | 'week' | 'month';

export type DashboardSummary = {
  totalSales: number;
  salesCount: number;
  itemsSold: number;
  averageTicket: number;
};

export type DashboardTopProduct = {
  productId: number;
  name: string;
  quantitySold: number;
  total: number;
  imageUrl: string | null;
};

export type DashboardRecentSale = {
  id: number;
  customerName: string;
  total: number;
  paymentMethod: PaymentMethod;
  itemsCount: number;
  createdAt: string;
};

export type DashboardStats = {
  period: StatsPeriod;
  summary: DashboardSummary;
  topProducts: DashboardTopProduct[];
  recentSales: DashboardRecentSale[];
};

// ---- Admin dashboard (GET /admin/dashboard) ----
// Global, cross-seller KPIs. Normalized from the raw admin API in
// src/api/admin/dashboard.ts (snake_case + string-decimals → camelCase + number).

export type UserRef = { id: number; name: string };

export type AdminSalesByBranch = {
  branchId: number;
  branchName: string;
  salesCount: number;
  total: number;
};

export type AdminSalesBySeller = {
  sellerId: number;
  sellerName: string;
  salesCount: number;
  total: number;
};

export type AdminRecentSale = {
  id: number;
  customerName: string;
  total: number;
  seller: UserRef | null;
  branch: { id: number; name: string } | null;
  itemsCount: number;
  createdAt: string;
};

// One (product, branch) pair whose stock is below the low-stock threshold.
export type LowStockItem = {
  productId: number;
  productCode: string;
  productName: string;
  productType: ProductType;
  imageUrl: string | null;
  branchId: number;
  branchName: string;
  stock: number;
};

export type AdminDashboard = {
  period: StatsPeriod;
  summary: DashboardSummary;
  topProducts: DashboardTopProduct[];
  salesByBranch: AdminSalesByBranch[];
  salesBySeller: AdminSalesBySeller[];
  recentSales: AdminRecentSale[];
  // Products low on stock. `count` is the total number of critical
  // (product, branch) pairs; `products` lists up to 50 of them (most critical
  // first) and `hasMore` is true when count exceeds that.
  lowStock: {
    threshold: number;
    count: number;
    products: LowStockItem[];
    hasMore: boolean;
  };
};

// ---- Admin sales (cross-seller: GET /admin/sales, /admin/sales/{id}) ----
// Same as the seller shapes, plus the seller who made the sale. `deletedAt` is
// set only for trashed (soft-deleted) sales.

export type AdminSaleSummary = SaleSummary & {
  seller: UserRef | null;
  branch: { id: number; name: string } | null;
  deletedAt?: string | null;
};

export type AdminSaleDetail = SaleDetail & {
  seller: UserRef | null;
  deletedAt: string | null;
};

// ---- Admin catalog (GET /admin/products, /admin/products/{id}) ----
// Admins see the master catalog: statuses include `private` (hidden from
// sellers), and stock is broken down per branch rather than branch-scoped.

export type AdminProductStatus = 'private' | 'public' | 'published';

// Stock for one branch — shared by product- and variation-level breakdowns.
export type StockByBranch = {
  branchId: number;
  branchName: string;
  stock: number;
};

export type AdminProductImage = {
  id: number;
  url: string;
  isFeatured: boolean;
  sortOrder: number;
};

// A row in the admin product listing (GET /admin/products).
export type AdminProductRow = {
  id: number;
  code: string;
  name: string;
  type: ProductType;
  status: AdminProductStatus;
  unitValue: number;
  finalPrice: number;
  unitOfMeasure: string;
  imageUrl: string | null;
  variationsCount: number;
  category: CategoryRef | null;
  // Total across branches, when the API provides it (null if absent).
  stock: number | null;
};

// An attribute assigned to a product via the `product_attribute` pivot, as
// returned by GET /admin/products/{id}. Authoritative even for variable
// products that don't have variations yet.
export type AdminProductAttribute = {
  id: number;
  name: string;
  values: { id: number; value: string }[];
};

// Full product (GET /admin/products/{id}).
export type AdminProductDetail = {
  id: number;
  code: string;
  name: string;
  slug: string | null;
  description: string | null;
  shortDescription: string | null;
  type: ProductType;
  status: AdminProductStatus;
  unitValue: number;
  finalPrice: number;
  unitOfMeasure: string;
  variationsCount: number;
  category: CategoryRef | null;
  tags: { id: number; name: string }[];
  images: AdminProductImage[];
  stockByBranch: StockByBranch[];
  // Empty for simple products; for variable ones these are the attributes every
  // variation must supply exactly one value for.
  attributes: AdminProductAttribute[];
};

// ---- Admin master catalog (categories & tags) ----

// A category flattened out of the server's tree, carrying its nesting `depth`
// so the UI can indent it. `hasChildren` drives the delete warning.
export type AdminCategory = {
  id: number;
  name: string;
  parentId: number | null;
  productsCount: number;
  depth: number;
  hasChildren: boolean;
};

export type AdminTag = {
  id: number;
  name: string;
  productsCount: number;
};

// An attribute (Color, Talla…) with its values ordered by `position`.
export type AdminAttributeValue = {
  id: number;
  value: string;
  position: number;
};

export type AdminAttribute = {
  id: number;
  name: string;
  values: AdminAttributeValue[];
};

// ---- Admin organization (branches & users) ----

export type AdminBranch = {
  id: number;
  name: string;
  address: string | null;
  active: boolean;
  sellersCount: number;
};

export type AdminUserRole = 'seller' | 'admin';

// Admins carry no branch (the server nulls `branch_id` for non-sellers).
export type AdminUser = {
  id: number;
  name: string;
  email: string;
  role: AdminUserRole;
  branch: { id: number; name: string } | null;
};

// A variation with its per-branch stock (GET /admin/products/{id}/variations).
export type AdminVariation = {
  id: number;
  code: string;
  unitValue: number;
  finalPrice: number;
  imageUrl: string | null;
  attributeValues: AttributeValue[];
  stockByBranch: StockByBranch[];
};
