import KpiCard, { KpiGrid } from './KpiCard';
import { formatPrice } from '../utils/format';
import type { DashboardSummary } from '../types';

// Amber tops the money figures, navy the counts — the same on both dashboards.
const MONEY = '#ffc20e';
const COUNT = '#16213a';

// The four sales KPIs — total, count, items, average ticket — laid out the same
// on both dashboards (the seller's own, the admin's cross-seller). Only the
// numbers behind `summary` differ.
export default function SalesKpiGrid({ summary }: { summary?: DashboardSummary }) {
  return (
    <KpiGrid>
      <KpiCard label="Ventas totales" value={formatPrice(summary?.totalSales ?? 0)} accent={MONEY} />
      <KpiCard label="Ventas" value={String(summary?.salesCount ?? 0)} accent={COUNT} />
      <KpiCard label="Artículos vendidos" value={String(summary?.itemsSold ?? 0)} accent={COUNT} />
      <KpiCard label="Ticket promedio" value={formatPrice(summary?.averageTicket ?? 0)} accent={MONEY} />
    </KpiGrid>
  );
}
