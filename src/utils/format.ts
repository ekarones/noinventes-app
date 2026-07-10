// Formats a number as a price string. Centralized so changing currency later
// (or pulling it from settings) only touches one place.
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN', // soles peruanos (S/)
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
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
