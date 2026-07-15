import { Ionicons } from '@expo/vector-icons';
import type { ProductSortBy, SortDir } from '../api/products';
import type { SaleSortBy } from '../api/sales';

// One icon per meaning, so the same concept looks the same in every sort sheet.
// Recency carries a direction arrow (newest = down, oldest = up); the rest name
// the dimension being sorted and let the label state the direction ("A–Z",
// "menor a mayor").
//
// Before this, "Más recientes" was a clock in the catalogue and a down-arrow in
// the sales history, and money was a coin in one list and an arrow in the other.
const ICON = {
  newest: 'arrow-down-outline',
  oldest: 'arrow-up-outline',
  name: 'text-outline',
  code: 'barcode-outline',
  money: 'cash-outline', // a product's price and a sale's total are both money
  customer: 'person-outline',
} satisfies Record<string, keyof typeof Ionicons.glyphMap>;

export type ProductSortOption = {
  key: string;
  label: string;
  sortBy: ProductSortBy;
  sortDir: SortDir;
  icon: keyof typeof Ionicons.glyphMap;
};

export type SaleSortOption = {
  key: string;
  label: string;
  sortBy: SaleSortBy;
  sortDir: SortDir;
  icon: keyof typeof Ionicons.glyphMap;
};

// Friendly presets over the API's sort_by/sort_dir whitelist
// (id | created_at | name | code | final_price). Shared by the seller catalogue
// and the admin product list; each screen picks its own default index to match
// the server's (seller defaults to name, admin to newest).
export const PRODUCT_SORT_OPTIONS: ProductSortOption[] = [
  { key: 'name_asc', label: 'Nombre (A–Z)', sortBy: 'name', sortDir: 'asc', icon: ICON.name },
  { key: 'name_desc', label: 'Nombre (Z–A)', sortBy: 'name', sortDir: 'desc', icon: ICON.name },
  { key: 'newest', label: 'Más recientes', sortBy: 'created_at', sortDir: 'desc', icon: ICON.newest },
  { key: 'cheapest', label: 'Precio: menor a mayor', sortBy: 'final_price', sortDir: 'asc', icon: ICON.money },
  { key: 'dearest', label: 'Precio: mayor a menor', sortBy: 'final_price', sortDir: 'desc', icon: ICON.money },
  { key: 'code_asc', label: 'Código (A–Z)', sortBy: 'code', sortDir: 'asc', icon: ICON.code },
];

export const SELLER_DEFAULT_SORT = PRODUCT_SORT_OPTIONS.findIndex((o) => o.key === 'name_asc');
export const ADMIN_DEFAULT_SORT = PRODUCT_SORT_OPTIONS.findIndex((o) => o.key === 'newest');

// The seller's history and the admin's cross-seller list sort the same way.
export const SALE_SORT_OPTIONS: SaleSortOption[] = [
  { key: 'recent', label: 'Más recientes', sortBy: 'created_at', sortDir: 'desc', icon: ICON.newest },
  { key: 'oldest', label: 'Más antiguas', sortBy: 'created_at', sortDir: 'asc', icon: ICON.oldest },
  { key: 'highest', label: 'Mayor monto', sortBy: 'total', sortDir: 'desc', icon: ICON.money },
  { key: 'lowest', label: 'Menor monto', sortBy: 'total', sortDir: 'asc', icon: ICON.money },
  { key: 'customer', label: 'Cliente (A–Z)', sortBy: 'customer_name', sortDir: 'asc', icon: ICON.customer },
];

// Newest first — the implicit order the API already returns.
export const SALE_DEFAULT_SORT = 0;
