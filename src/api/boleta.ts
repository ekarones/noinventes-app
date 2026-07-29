import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { API_BASE_URL } from './config';
import { apiRequest } from './client';
import { getSessionToken } from './session';
import type { PrintPayload } from '../types';

// The paper the thermal printer is loaded with. A constant rather than a magic
// number at the call site, so switching to a 58mm printer is one edit.
export const RECEIPT_WIDTH_MM = 80;

// Seller and admin download the same boleta and fetch the same ESC/POS stream;
// only the scope of the route differs (`/sales` for the seller's own sales,
// `/admin/sales` for any). These two take the base path so the split is one word
// at the call site instead of two copies of the body.

// GET {base}/{id}/escpos — the receipt already composed as ESC/POS bytes, for
// the Bluetooth thermal printer. The app writes it to the socket untouched:
// layout, code page, logo and QR are all decided server-side, which is why the
// ticket can gain a field without an app release.
export async function fetchReceiptPayloadFrom(
  basePath: string,
  saleId: number
): Promise<PrintPayload> {
  return apiRequest<PrintPayload>(`${basePath}/${saleId}/escpos?width=${RECEIPT_WIDTH_MM}`);
}

// Downloads the sale receipt (boleta) PDF with the auth header, then opens the
// native share sheet so it can be printed / saved / sent. The PDF is the other
// half of the escpos pair — that one for paper at the counter, this one for
// sharing and archiving.
export async function downloadAndShareBoletaFrom(basePath: string, saleId: number): Promise<void> {
  const token = getSessionToken();
  const url = `${API_BASE_URL}${basePath}/${saleId}/pdf`;
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

// Seller scope: only the vendor who made the sale is authorized (403 otherwise).
export const fetchReceiptPayload = (saleId: number) => fetchReceiptPayloadFrom('/sales', saleId);
export const downloadAndShareBoleta = (saleId: number) =>
  downloadAndShareBoletaFrom('/sales', saleId);
