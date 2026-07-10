import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { API_BASE_URL } from '../config';
import { getSessionToken } from '../session';

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
