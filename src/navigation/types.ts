// Route param lists for type-safe navigation.

import type {
  AdminProductDetail,
  AdminProductRow,
  AdminSaleSummary,
  AdminUser,
  AdminVariation,
  Product,
  SaleSummary,
  StockByBranch,
} from '../types';

export type DashboardStackParamList = {
  Dashboard: undefined;
  Profile: undefined;
};

export type CatalogStackParamList = {
  Catalog: undefined;
  // variationId: when arriving from a scanned variation QR, preselect it.
  ProductDetail: { product: Product; variationId?: number };
};

export type CartStackParamList = {
  Cart: undefined;
  Checkout: undefined;
};

export type OrdersStackParamList = {
  Orders: undefined;
  OrderDetail: { sale: SaleSummary };
};

export type TabParamList = {
  DashboardTab: undefined;
  CatalogTab: undefined;
  CartTab: undefined;
  OrdersTab: undefined;
};

// Admin interface = bottom tabs, each wrapping its own native-stack.
// New admin areas (productos, usuarios, …) get added as new tabs as they ship.
export type AdminHomeStackParamList = {
  AdminDashboard: undefined;
  AdminProfile: undefined;
};

export type AdminSalesStackParamList = {
  AdminSales: undefined;
  // `trashed` opens the read-only detail of a soft-deleted sale.
  AdminSaleDetail: { sale: AdminSaleSummary; trashed?: boolean };
  AdminSalesTrash: undefined;
};

export type AdminProductsStackParamList = {
  AdminProducts: undefined;
  AdminProductDetail: { product: AdminProductRow };
  // `product` absent = creating a new one.
  AdminProductForm: { product?: AdminProductDetail };
  AdminProductImages: { productId: number; productName: string };
  AdminProductsTrash: undefined;
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
  AdminVariationForm: {
    productId: number;
    productName: string;
    variation?: AdminVariation;
    attributeIds?: number[];
  };
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
