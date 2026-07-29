import KpiCard, { KpiGrid } from './KpiCard';
import { formatPrice } from '../utils/format';
import type { DashboardSummary } from '../types';

// The four sales KPIs — total, count, items, average ticket — laid out the same
// on both dashboards (the seller's own, the admin's cross-seller). It was the
// same four cards verbatim on each; only the numbers behind `summary` differ.
export default function SalesKpiGrid({ summary }: { summary?: DashboardSummary }) {
  return (
    <KpiGrid>
      <KpiCard
        icon="cash-outline"
        label="Ventas totales"
        value={formatPrice(summary?.totalSales ?? 0)}
      />
      <KpiCard icon="receipt-outline" label="Ventas" value={String(summary?.salesCount ?? 0)} />
      <KpiCard
        icon="cube-outline"
        label="Artículos vendidos"
        value={String(summary?.itemsSold ?? 0)}
      />
      <KpiCard
        icon="trending-up-outline"
        label="Ticket promedio"
        value={formatPrice(summary?.averageTicket ?? 0)}
      />
    </KpiGrid>
  );
}
