// Formats a number as a price string. Centralized so changing currency later
// (or pulling it from settings) only touches one place.
//
// ALWAYS two decimals. This used to round to whole soles, which in a POS is not
// a cosmetic choice: the seller charges what they see. A product at 39.90 showed
// as "S/ 40", three of them as "S/ 120" — while the sale, and the receipt the
// customer takes home, said 119.70. Thirty cents against the till, every time.
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN', // soles peruanos (S/)
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// A variable product's price as a range. `max` is null for simple products (one
// price) and equal to `min` when every variation costs the same — both collapse
// to a single price. Only a genuine spread (min < max) reads as "S/ 39.90 – S/ 59.90".
export function formatPriceRange(min: number, max: number | null): string {
  if (max == null || toCents(max) <= toCents(min)) return formatPrice(min);
  return `${formatPrice(min)} – ${formatPrice(max)}`;
}

// True when a product spans a real price range — several variations at different
// prices — as opposed to one price (simple, or all variations equal).
export function hasPriceRange(min: number, max: number | null): boolean {
  return max != null && toCents(max) > toCents(min);
}

// Money in cents. Summing `price * quantity` in floating point drifts: 39.90 × 3
// is 119.69999999999999, not 119.70. Compare and total in cents, never in soles.
export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

// Snaps an amount back to a clean 2-decimal value after arithmetic.
export function roundMoney(amount: number): number {
  return toCents(amount) / 100;
}

// Local date as "Y-m-d" (what the API expects for date_from / date_to filters).
export function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// e.g. "29 jun 2026, 14:30"
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-PE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Relative time, e.g. "hace 5 min", "hace 2 h", "ayer". Falls back to the
// absolute date for anything older than a week.
export function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'hace un momento';
  if (min < 60) return `hace ${min} min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `hace ${hr} h`;
  const days = Math.floor(hr / 24);
  if (days === 1) return 'ayer';
  if (days < 7) return `hace ${days} días`;
  return formatDate(iso);
}
