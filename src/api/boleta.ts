import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { API_BASE_URL } from './config';
import { apiRequest } from './client';
import { getSessionToken } from './session';
import type { PrintPayload } from '../types';

// The paper the thermal printer is loaded with. A constant rather than a magic
// number at the call site, so switching to a 58mm printer is one edit.
export const RECEIPT_WIDTH_MM = 80;

// GET /sales/{id}/escpos — the receipt already composed as ESC/POS bytes, for
// the Bluetooth thermal printer. The app writes it to the socket untouched:
// layout, code page, logo and QR are all decided server-side, which is why the
// ticket can gain a field without an app release.
//
// The PDF above is the other half of the same pair — that one is for sharing
// and archiving, this one is for paper at the counter.
export async function fetchReceiptPayload(saleId: number): Promise<PrintPayload> {
  return apiRequest<PrintPayload>(`/sales/${saleId}/escpos?width=${RECEIPT_WIDTH_MM}`);
}

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
