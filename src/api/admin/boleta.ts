import { downloadAndShareBoletaFrom, fetchReceiptPayloadFrom } from '../boleta';

// Admin scope: not gated to a seller, so an admin can pull the boleta / thermal
// receipt of ANY sale. Same bodies as the seller's — see src/api/boleta.ts —
// only the route base differs.
export const fetchAdminReceiptPayload = (saleId: number) =>
  fetchReceiptPayloadFrom('/admin/sales', saleId);
export const downloadAndShareAdminBoleta = (saleId: number) =>
  downloadAndShareBoletaFrom('/admin/sales', saleId);
