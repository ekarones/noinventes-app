import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import type { AdminProductStatus } from '../types';

// One source of truth for how a product's status reads, shared by the products
// list and the product detail (both had their own copy of the label map).
//
// Two states: `public` reaches the seller's catalogue (green), `private` is
// hidden from it (grey).
export const PRODUCT_STATUS_LABEL: Record<AdminProductStatus, string> = {
  public: 'Público',
  private: 'Privado',
};

export const PRODUCT_STATUS_ICON: Record<AdminProductStatus, keyof typeof Ionicons.glyphMap> = {
  public: 'eye-outline',
  private: 'lock-closed-outline',
};

export function productStatusColor(status: AdminProductStatus): string {
  return status === 'private' ? colors.textSecondary : colors.success;
}
