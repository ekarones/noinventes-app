import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { API_BASE_URL } from '../config';
import { apiRequest } from '../client';
import { getSessionToken } from '../session';
import { RECEIPT_WIDTH_MM } from '../boleta';
import type { PrintPayload } from '../../types';

// GET /admin/sales/{id}/escpos — same envelope as the seller's, without the
// per-seller scope: an admin can print the thermal receipt of any sale.
export async function fetchAdminReceiptPayload(saleId: number): Promise<PrintPayload> {
  return apiRequest<PrintPayload>(`/admin/sales/${saleId}/escpos?width=${RECEIPT_WIDTH_MM}`);
}

// Downloads the receipt (boleta) PDF for ANY sale and opens the native share
// sheet. GET /admin/sales/{id}/pdf is admin-gated (not scoped to a seller), so
// an admin can pull the boleta of any seller's sale.
export async function downloadAndShareAdminBoleta(saleId: number): Promise<void> {
  const token = getSessionToken();
  const url = `${API_BASE_URL}/admin/sales/${saleId}/pdf`;
  const filename = `boleta-${String(saleId).padStart(6, '0')}.pdf`;
  const destination = new File(Paths.cache, filename);

  const file = await File.downloadFileAsync(url, destination, {
    headers: { Authorization: `Bearer ${token ?? ''}`, Accept: 'application/pdf' },
    idempotent: true, // overwrite if a previous download exists
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: filename,
    });
  }
}
