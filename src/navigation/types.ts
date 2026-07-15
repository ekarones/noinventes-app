// Route param lists for type-safe navigation.

import type {
  AdminProductDetail,
  AdminProductRow,
  AdminSaleSummary,
  AdminUser,
  AdminVariation,
  LowStockItem,
  Product,
  SaleSummary,
  StockByBranch,
} from '../types';

// Two screens are reachable from more than one tab: the dashboard opens a
// best-seller and a recent sale, exactly as the catalogue and the history do. A
// route belongs to a STACK, not to a tab — so these are declared once and mixed
// into every stack that can reach them. Pushing them on the tab that "owns" them
// instead would mean going back strands you on that tab's list, not on Inicio.
type ProductDetailRoute = {
  // variationId: when arriving from a scanned variation QR, or from a best-seller
  // row that ranked one variation, preselect it.
  ProductDetail: { product: Product; variationId?: number };
};

type OrderDetailRoute = {
  OrderDetail: { sale: SaleSummary };
};

export type DashboardStackParamList = ProductDetailRoute &
  OrderDetailRoute & {
    Dashboard: undefined;
    Profile: undefined;
  };

export type CatalogStackParamList = ProductDetailRoute & {
  Catalog: undefined;
};

export type CartStackParamList = {
  Cart: undefined;
  Checkout: undefined;
};

export type OrdersStackParamList = OrderDetailRoute & {
  Orders: undefined;
};

export type TabParamList = {
  DashboardTab: undefined;
  CatalogTab: undefined;
  CartTab: undefined;
  OrdersTab: undefined;
};

// Admin interface = bottom tabs, each wrapping its own native-stack.
// New admin areas (productos, usuarios, …) get added as new tabs as they ship.

// The same story as the seller's, one step deeper: the admin dashboard opens a
// best-seller, and a product detail leads on to the whole edit sub-flow — so the
// sub-flow has to be reachable from wherever the detail was pushed.
type AdminProductRoutes = {
  AdminProductDetail: { product: AdminProductRow };
  // `product` absent = creating a new one.
  AdminProductForm: { product?: AdminProductDetail };
  AdminProductImages: { productId: number; productName: string };
  // Edit stock per branch for a product (simple) or a single variation.
  AdminStockEdit: {
    kind: 'product' | 'variation';
    id: number;
    title: string;
    subtitle?: string;
    stock: StockByBranch[];
  };
  // `variation` absent = creating. `attributeIds` are the attributes the product
  // already uses; a new variation must supply exactly one value for each.
  // `productCode` seeds the auto-generated variation code; `productUnitValue` /
  // `productFinalPrice` seed the price fields, inherited from the parent.
  AdminVariationForm: {
    productId: number;
    productName: string;
    productCode?: string;
    productUnitValue?: number;
    productFinalPrice?: number;
    variation?: AdminVariation;
    attributeIds?: number[];
  };
};

type AdminSaleDetailRoute = {
  // `trashed` opens the read-only detail of a soft-deleted sale.
  AdminSaleDetail: { sale: AdminSaleSummary; trashed?: boolean };
};

export type AdminHomeStackParamList = AdminProductRoutes &
  AdminSaleDetailRoute & {
    AdminDashboard: undefined;
    AdminProfile: undefined;
    AdminLowStock: { items: LowStockItem[]; threshold: number; hasMore: boolean };
  };

export type AdminSalesStackParamList = AdminSaleDetailRoute & {
  AdminSales: undefined;
  AdminSalesTrash: undefined;
};

export type AdminProductsStackParamList = AdminProductRoutes & {
  AdminProducts: undefined;
  AdminProductsTrash: undefined;
};

// "Más" hosts the master-catalog / management sections.
export type AdminMoreStackParamList = {
  AdminMore: undefined;
  AdminCategories: undefined;
  AdminTags: undefined;
  AdminAttributes: undefined;
  AdminBranches: undefined;
  AdminUsers: undefined;
  // `user` absent = creating a new one.
  AdminUserForm: { user?: AdminUser };
};

export type AdminTabParamList = {
  AdminHomeTab: undefined;
  AdminSalesTab: undefined;
  AdminProductsTab: undefined;
  AdminMoreTab: undefined;
};
