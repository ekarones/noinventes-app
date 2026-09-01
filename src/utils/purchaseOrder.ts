import type { PurchaseOrderStatus } from '../types';

// The status chip's label + colors (5a soft-fill status style, like StockBadge).
// Shared by the list and the detail so they can't drift.
export function poStatusMeta(status: PurchaseOrderStatus): { label: string; bg: string; fg: string } {
  switch (status) {
    case 'draft':
      return { label: 'Borrador', bg: '#f1f3f7', fg: 'rgba(22, 33, 58, 0.6)' };
    case 'ordered':
      return { label: 'Enviada', bg: '#fff3cf', fg: '#8a6400' };
    case 'received':
      return { label: 'Recibida', bg: '#e7f3ea', fg: '#2e7d4f' };
    case 'cancelled':
      return { label: 'Cancelada', bg: '#fdece8', fg: '#c22f0c' };
  }
}
