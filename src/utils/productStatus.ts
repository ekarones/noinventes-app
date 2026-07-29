import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import type { AdminProductStatus } from '../types';

// One source of truth for how a product's status reads, shared by the products
// list and the product detail (both had their own copy of the label map).
//
// `published` and `public` are equally visible to the seller; what separates
// them is "featured" vs not, which the icon carries. Colour answers the only
// distinction that changes what the seller sees: visible (green) vs private
// (grey).
export const PRODUCT_STATUS_LABEL: Record<AdminProductStatus, string> = {
  published: 'Publicado',
  public: 'Público',
  private: 'Privado',
};

export const PRODUCT_STATUS_ICON: Record<AdminProductStatus, keyof typeof Ionicons.glyphMap> = {
  published: 'star-outline',
  public: 'eye-outline',
  private: 'lock-closed-outline',
};

export function productStatusColor(status: AdminProductStatus): string {
  return status === 'private' ? colors.textSecondary : colors.success;
}
