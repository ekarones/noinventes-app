// Shared domain types. These mirror the Sellers Products API (snake_case and
// string decimals are normalized to camelCase + numbers in src/api/products.ts).

export type CategoryRef = {
  id: number;
  name: string;
};

// The server sends the tree already flattened depth-first (parent immediately
// followed by its descendants, siblings alphabetical), tagged with its nesting
// level — the picker just indents by `depth` and renders in order.
export type Category = {
  id: number;
  parentId: number | null;
  name: string;
  depth: number;
  hasChildren: boolean;
};

export type ProductType = 'simple' | 'variable';
// The seller only ever receives visible products, so a single state.
export type ProductStatus = 'public';

// One image of a product's gallery. Only the product DETAIL endpoint returns
// these — the listing sends just the featured image, so `images` is empty there.
export type ProductImageItem = {
  id: number;
  url: string;
  thumbUrl: string;
  isFeatured: boolean;
  sortOrder: number;
};

export type Product = {
  id: number;
  code: string;
  name: string;
  slug: string | null;
  type: ProductType;
  status: ProductStatus;
  unitValue: number;
  // For a variable product this is the cheapest variation ("desde"); for a simple
  // one it's the price. `finalPriceMax` is the dearest variation, or null when the
  // product is simple (no range) — together they bound the price range.
  finalPrice: number;
  finalPriceMax: number | null;
  unitOfMeasure: string;
  imageUrl: string | null;
  // ~600px version of imageUrl, served by the API. Use it in lists and cards;
  // keep imageUrl for the full-screen detail. Null when the product has no image.
  imageThumbUrl: string | null;
  // Full gallery, ordered by sortOrder. Populated only by the detail endpoint;
  // empty when the product came from the listing.
  images: ProductImageItem[];
  stock: number; // stock at the seller's branch
  variationsCount: number;
  category: CategoryRef | null;
  // Descriptions and tags: only the DETAIL endpoint (`GET /products/{id}`) fills
  // these; the listing leaves them empty. Shown behind the detail's "info" button.
  description: string | null;
  shortDescription: string | null;
  tags: { id: number; name: string }[];
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
  imageThumbUrl: string | null;
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

// ---- Printing ----

// A byte stream the server already composed, ready to write to a Bluetooth
// printer socket. The app never builds one: layout, QR, code page and printer
// dialect all live server-side, so a format change never needs a release.
//
// Base64 because the stream carries control bytes (0x1b, 0x1d, 0x00) that don't
// survive as text — the native side decodes it back to raw bytes.
export type PrintPayload = {
  payload: string;
  encoding: 'base64';
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
  // Σ of the item quantities. Served by the API, like the list row's.
  itemsCount: number;
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

// One line of the best-sellers ranking. The API groups by
// (product_id, product_variation_id), so a variable product that sold two
// combinations ranks as two rows — the catalogue, the cart and the receipt all
// treat a variation as its own sellable thing, and the dashboard now does too.
//
// `variationId` / `variationLabel` are null for a simple product. `name` is the
// parent's clean name; the UI joins it with the label ("Polo básico · Rojo · M").
// The images already point at the variation when it has its own.
export type DashboardTopProduct = {
  productId: number;
  variationId: number | null;
  variationLabel: string | null;
  name: string;
  quantitySold: number;
  total: number;
  imageUrl: string | null;
  imageThumbUrl: string | null;
};

// Tells whether the inline ranking (top 5) covers the whole period or there are
// more rows to page through via the dedicated top-products endpoint.
export type TopProductsMeta = {
  total: number;
  hasMore: boolean;
  limit: number;
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
  topProductsMeta: TopProductsMeta;
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
  paymentMethod: PaymentMethod;
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
  imageThumbUrl: string | null;
  branchId: number;
  branchName: string;
  stock: number;
};

// A supplier in the purchasing ranking (Σ received-order totals in the period).
export type DashboardTopSupplier = {
  supplierId: number;
  displayName: string;
  ordersCount: number;
  total: number;
};

// The purchasing block of the admin dashboard. `periodTotal`/`receivedCount`
// are period-scoped (by received_at); `pending*`/`draftCount` are a current-state
// snapshot (not period-filtered).
export type DashboardPurchases = {
  periodTotal: number;
  receivedCount: number;
  pendingOrdersCount: number;
  pendingOrdersValue: number;
  draftCount: number;
  topSuppliers: DashboardTopSupplier[];
  topSuppliersMeta: TopProductsMeta;
};

export type AdminDashboard = {
  period: StatsPeriod;
  summary: DashboardSummary;
  topProducts: DashboardTopProduct[];
  topProductsMeta: TopProductsMeta;
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
  // Purchasing (proveedores + órdenes de compra).
  purchases: DashboardPurchases;
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

export type AdminProductStatus = 'private' | 'public';

// Stock for one branch — shared by product- and variation-level breakdowns.
export type StockByBranch = {
  branchId: number;
  branchName: string;
  stock: number;
};

export type AdminProductImage = {
  id: number;
  url: string;
  // ~600px version of `url`, served by the API.
  thumbUrl: string;
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
  // "desde" for variable products; the price for simple ones. `finalPriceMax` is
  // the top of the range, or null for simple products.
  finalPrice: number;
  finalPriceMax: number | null;
  unitOfMeasure: string;
  imageUrl: string | null;
  imageThumbUrl: string | null;
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
  // "desde" for variable products; the price for simple ones. `finalPriceMax` is
  // the top of the range, or null for simple products.
  finalPrice: number;
  finalPriceMax: number | null;
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

// ---- Empresa / emisor (singleton por tenant) ----

// The issuer data (RUC + names + fiscal address) the server prints on the
// receipt/invoice header. The API returns `null` until the admin configures it
// for the first time; `isConfigured` flips to true once saved.
export type AdminCompany = {
  ruc: string;
  razonSocial: string;
  nombreComercial: string;
  direccion: string | null;
  distrito: string | null;
  provincia: string | null;
  departamento: string | null;
  ubigeo: string | null;
  isConfigured: boolean;
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
  imageThumbUrl: string | null;
  attributeValues: AttributeValue[];
  stockByBranch: StockByBranch[];
};

// ---- Proveedores (compras) ----

// A supplier: the company you buy stock from to resell. `displayName` is
// server-computed (`nombreComercial ?? razonSocial`) — use it directly.
export type AdminSupplier = {
  id: number;
  ruc: string;
  razonSocial: string;
  nombreComercial: string | null;
  displayName: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  isActive: boolean;
};

// ---- Órdenes de compra ----

// draft → ordered → received (adds stock); draft|ordered → cancelled.
export type PurchaseOrderStatus = 'draft' | 'ordered' | 'received' | 'cancelled';

// A row in the purchase-orders list.
export type AdminPurchaseOrderRow = {
  id: number;
  code: string;
  status: PurchaseOrderStatus;
  supplier: { id: number; displayName: string };
  branch: { id: number; name: string };
  subtotal: number;
  total: number;
  orderedAt: string | null;
  receivedAt: string | null;
  createdAt: string;
};

// One line of a purchase order. Exactly one of product/variation id is set.
export type AdminPurchaseOrderItem = {
  id: number;
  productId: number | null;
  productVariationId: number | null;
  label: string;
  quantity: number;
  unitCost: number;
  subtotal: number;
};

// The full order (GET /admin/purchase-orders/{id}). `can` mirrors the server's
// `can_*` flags — the single source of truth for which actions the UI enables.
export type AdminPurchaseOrderDetail = {
  id: number;
  code: string;
  status: PurchaseOrderStatus;
  supplier: {
    id: number;
    ruc: string;
    razonSocial: string;
    nombreComercial: string | null;
    displayName: string;
    contactName: string | null;
    email: string | null;
    phone: string | null;
  };
  branch: { id: number; name: string };
  subtotal: number;
  total: number;
  notes: string | null;
  orderedAt: string | null;
  receivedAt: string | null;
  createdAt: string;
  items: AdminPurchaseOrderItem[];
  can: { edit: boolean; send: boolean; receive: boolean; cancel: boolean; delete: boolean };
};

// A pickable product/variation for the order form (from /options).
export type PurchaseOrderPickable = {
  productId: number | null;
  productVariationId: number | null;
  code: string;
  label: string;
};

// Everything the "new order" form needs, in one request (GET .../options).
export type PurchaseOrderOptions = {
  suppliers: { id: number; ruc: string; displayName: string }[];
  branches: { id: number; name: string }[];
  pickables: PurchaseOrderPickable[];
};
