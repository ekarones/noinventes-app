import { Ionicons } from '@expo/vector-icons';
import type { ProductSortBy, SortDir } from '../api/products';

export type ProductSortOption = {
  key: string;
  label: string;
  sortBy: ProductSortBy;
  sortDir: SortDir;
  icon: keyof typeof Ionicons.glyphMap;
};

// Friendly presets over the API's sort_by/sort_dir whitelist
// (id | created_at | name | code | final_price). Shared by the seller catalog
// and the admin product list; each screen picks its own default index to match
// the server's (seller defaults to name, admin to newest).
export const PRODUCT_SORT_OPTIONS: ProductSortOption[] = [
  { key: 'name_asc', label: 'Nombre (A–Z)', sortBy: 'name', sortDir: 'asc', icon: 'text-outline' },
  { key: 'name_desc', label: 'Nombre (Z–A)', sortBy: 'name', sortDir: 'desc', icon: 'text-outline' },
  { key: 'newest', label: 'Más recientes', sortBy: 'created_at', sortDir: 'desc', icon: 'time-outline' },
  { key: 'cheapest', label: 'Precio: menor a mayor', sortBy: 'final_price', sortDir: 'asc', icon: 'arrow-up-outline' },
  { key: 'dearest', label: 'Precio: mayor a menor', sortBy: 'final_price', sortDir: 'desc', icon: 'arrow-down-outline' },
  { key: 'code_asc', label: 'Código (A–Z)', sortBy: 'code', sortDir: 'asc', icon: 'barcode-outline' },
];

export const SELLER_DEFAULT_SORT = PRODUCT_SORT_OPTIONS.findIndex((o) => o.key === 'name_asc');
export const ADMIN_DEFAULT_SORT = PRODUCT_SORT_OPTIONS.findIndex((o) => o.key === 'newest');
