import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { API_BASE_URL } from './config';
import { getSessionToken } from './session';

// Downloads the sale receipt (boleta) PDF with the auth header, then opens the
// native share sheet so the seller can print/save/send it. GET /sales/{id}/pdf
// is authorized only for the seller who made the sale (403 otherwise).
export async function downloadAndShareBoleta(saleId: number): Promise<void> {
  const token = getSessionToken();
  const url = `${API_BASE_URL}/sales/${saleId}/pdf`;
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
