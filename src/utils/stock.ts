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

// The fill behind `stockColor`, for when the level is drawn as a badge rather
// than as coloured text. Same three levels, same thresholds — kept next to each
// other so they can't drift.
export function stockSoftColor(stock: number): string {
  if (stock <= 0) return colors.errorSoft;
  if (stock <= LOW_STOCK) return colors.warningSoft;
  return colors.successSoft;
}
