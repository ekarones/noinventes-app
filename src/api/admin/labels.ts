import { apiRequest } from '../client';
import type { PrintPayload } from '../../types';

// What to print: which product (or variation) and how many copies of it.
export type LabelRequestItem = {
  productId: number;
  /** null = a simple product, which has no variation of its own. */
  variationId?: number | null;
  quantity: number;
};

// The label stock in use. **The server only accepts 30x20 today** — its bitmap
// layout is calibrated for that roll and anything else is a 422. So this is not
// a knob to turn from here: a new roll size needs the server composer first.
export const LABEL_SIZE = { widthMm: 30, heightMm: 20 } as const;

// POST /admin/labels/print-payload — renders N labels into one job. Sending the
// whole batch in a single request (rather than one call per label) keeps the
// copies contiguous on the roll and is one round-trip instead of dozens.
//
// `attributeIds` are the attribute types (Color, Talla, …) to print on the
// sticker, one choice for the whole batch. Omitted, the server prints them all
// — so leaving it out keeps the old behaviour. An empty array is a real choice:
// "print no attributes", just the name, price and QR.
export async function fetchLabelPayload(
  items: LabelRequestItem[],
  attributeIds?: number[]
): Promise<PrintPayload> {
  return apiRequest<PrintPayload>('/admin/labels/print-payload', {
    method: 'POST',
    body: {
      items: items.map((i) => ({
        product_id: i.productId,
        product_variation_id: i.variationId ?? null,
        quantity: i.quantity,
      })),
      width_mm: LABEL_SIZE.widthMm,
      height_mm: LABEL_SIZE.heightMm,
      ...(attributeIds !== undefined && { attribute_ids: attributeIds }),
    },
  });
}
