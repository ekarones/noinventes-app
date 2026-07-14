import type { CartItem, Variation } from '../types';

// Unique cart key per (product, variation).
export function makeCartKey(productId: number, variationId: number | null): string {
  return variationId != null ? `${productId}:${variationId}` : `${productId}`;
}

// Effective price/stock/image: the variation overrides the product when present.
export function linePrice(item: CartItem): number {
  return item.variation?.finalPrice ?? item.product.finalPrice;
}

export function lineStock(item: CartItem): number {
  return item.variation?.stock ?? item.product.stock;
}

// Thumbnail for a cart row: the variation's, falling back to the parent
// product's (per API guidance). Cart rows are small, so use the ~600px thumb.
export function lineImageUrl(item: CartItem): string | null {
  return item.variation?.imageThumbUrl ?? item.product.imageThumbUrl;
}

// "Rojo · M" — built from the variation's attribute values.
export function variationLabel(variation: Variation): string {
  return variation.attributeValues.map((a) => a.value).join(' · ');
}
