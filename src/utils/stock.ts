import { colors } from '../theme/colors';

// At/below this many units, stock is flagged as "low" (amber).
const LOW_STOCK = 5;

// Shared stock color coding used across catalog and product detail:
// red = out of stock, amber = low (≤ LOW_STOCK), green = healthy.
export function stockColor(stock: number): string {
  if (stock <= 0) return colors.error;
  if (stock <= LOW_STOCK) return colors.warning;
  return colors.success;
}
