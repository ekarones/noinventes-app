// Route param lists for type-safe navigation.

import type { CompositeNavigationProp, NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type {
  AdminPaymentIntent,
  AdminProductDetail,
  AdminPurchaseOrderDetail,
  AdminPurchaseOrderRow,
  AdminSaleSummary,
  AdminSupplier,
  AdminUser,
  AdminVariation,
  LowStockItem,
  Product,
  PurchaseOrderStatus,
  SaleSummary,
  StatsPeriod,
  StockByBranch,
} from '../types';

// The admin product detail re-fetches everything from the id; what it receives
// is only a seed for the header while that request is in flight. Typing it as a
// full `AdminProductRow` forced callers that hold a ranking or low-stock row to
// fabricate a row full of zeros just to satisfy the compiler — so the route asks
// for exactly the two fields it reads.
type ProductSeed = { id: number; name: string };

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
    // In-app user guide (role-aware content).
    Guide: undefined;
    // The full best-sellers ranking, scoped to the period the dashboard shows.
    TopProducts: { period: StatsPeriod };
  };

export type CatalogStackParamList = ProductDetailRoute & {
  Catalog: undefined;
};

export type CartStackParamList = {
  Cart: undefined;
  Checkout: undefined;
  // POS "cobro con link": the QR/status screen for a payment intent created from
  // the checkout total. Pushed on top of Checkout.
  PaymentIntent: { intent: AdminPaymentIntent };
};

export type OrdersStackParamList = OrderDetailRoute & {
  Orders: undefined;
};

// Each tab hosts a stack, so `NavigatorScreenParams` is what lets a screen jump
// to a sibling tab AND name the route inside it — `navigate('OrdersTab', {
// screen: 'Orders' })` — with the nested route still type-checked.
export type TabParamList = {
  DashboardTab: NavigatorScreenParams<DashboardStackParamList> | undefined;
  CatalogTab: NavigatorScreenParams<CatalogStackParamList> | undefined;
  CartTab: NavigatorScreenParams<CartStackParamList> | undefined;
  OrdersTab: NavigatorScreenParams<OrdersStackParamList> | undefined;
};

// Admin interface = bottom tabs, each wrapping its own native-stack.
// New admin areas (productos, usuarios, …) get added as new tabs as they ship.

// The same story as the seller's, one step deeper: the admin dashboard opens a
// best-seller, and a product detail leads on to the whole edit sub-flow — so the
// sub-flow has to be reachable from wherever the detail was pushed.
type AdminProductRoutes = {
  AdminProductDetail: { product: ProductSeed };
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
  // `productUnitValue` / `productFinalPrice` seed the price fields, inherited
  // from the parent.
  AdminVariationForm: {
    productId: number;
    productName: string;
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
    // In-app user guide (role-aware content). Same route name as the seller's so
    // the shared profile scaffold can navigate to it in either navigator.
    Guide: undefined;
    AdminLowStock: { items: LowStockItem[]; threshold: number; hasMore: boolean };
    // The full cross-seller ranking, keeping the dashboard's period + branch scope.
    AdminTopProducts: { period: StatsPeriod; branchId?: number | null };
    // The full supplier ranking (purchasing), same period + branch scope.
    AdminTopSuppliers: { period: StatsPeriod; branchId?: number | null };
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
  // The issuer/company singleton used for the receipt header (settings form).
  AdminCompany: undefined;
  // Inventory / purchasing.
  AdminSuppliers: undefined;
  // `supplier` absent = creating a new one.
  AdminSupplierForm: { supplier?: AdminSupplier };
  // `status` preselects the list filter (e.g. the dashboard's "por recibir").
  AdminPurchaseOrders: { status?: PurchaseOrderStatus } | undefined;
  // The detail re-fetches from the id; `order` is a seed row for the header.
  AdminPurchaseOrderDetail: { order: AdminPurchaseOrderRow };
  // `order` absent = new draft; present = editing (only allowed while draft).
  AdminPurchaseOrderForm: { order?: AdminPurchaseOrderDetail };
  // Cobros Culqi (host-and-share): historial → form → intent (URL/QR + polling).
  // El cliente paga en la página del server; la app nunca ve la tarjeta.
  AdminPayments: undefined;
  AdminPaymentForm: undefined;
  // `replace`d in from the form once the intent is created; also opened from the
  // history to view / keep polling an existing intent.
  AdminPaymentIntent: { intent: AdminPaymentIntent };
  // In-app user guide (also reachable from Perfil).
  Guide: undefined;
};

export type AdminTabParamList = {
  AdminHomeTab: NavigatorScreenParams<AdminHomeStackParamList> | undefined;
  AdminSalesTab: NavigatorScreenParams<AdminSalesStackParamList> | undefined;
  AdminProductsTab: NavigatorScreenParams<AdminProductsStackParamList> | undefined;
  AdminMoreTab: NavigatorScreenParams<AdminMoreStackParamList> | undefined;
};

// ---- Navigation props ----
// A screen that lives in a stack but also jumps to a sibling tab needs BOTH
// navigators' types. That combination is exactly what `useNavigation<any>()` was
// papering over — and why passing the wrong shape to a route went unnoticed.

export type DashboardNavigation = CompositeNavigationProp<
  NativeStackNavigationProp<DashboardStackParamList>,
  BottomTabNavigationProp<TabParamList>
>;

export type AdminHomeNavigation = CompositeNavigationProp<
  NativeStackNavigationProp<AdminHomeStackParamList>,
  BottomTabNavigationProp<AdminTabParamList>
>;

// Checkout finishes by sending the user to the history tab, outside its stack.
export type RootTabNavigation = BottomTabNavigationProp<TabParamList>;
