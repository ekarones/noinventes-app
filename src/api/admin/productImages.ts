import { apiRequest } from '../client';
import { filePart } from '../upload';
import type { AdminProductImage } from '../../types';

type RawAdminImage = { id: number; url: string; is_featured: boolean; sort_order: number };

function mapImage(i: RawAdminImage): AdminProductImage {
  return { id: i.id, url: i.url, isFeatured: i.is_featured, sortOrder: i.sort_order };
}

// POST /admin/products/{id}/images — up to 10 files per request, and at most 10
// images per product overall (422 if exceeded). Max 5 MB each. The very first
// image ever uploaded to a product automatically becomes the featured one.
export async function uploadProductImages(
  productId: number,
  uris: string[]
): Promise<AdminProductImage[]> {
  const form = new FormData();
  for (const uri of uris) form.append('images[]', filePart(uri));

  const res = await apiRequest<{ images: RawAdminImage[] }>(
    `/admin/products/${productId}/images`,
    { method: 'POST', body: form }
  );
  return (res.images ?? []).map(mapImage);
}

// PUT .../images/{imageId}/featured — unmarks the others.
export async function setFeaturedImage(productId: number, imageId: number): Promise<void> {
  await apiRequest(`/admin/products/${productId}/images/${imageId}/featured`, { method: 'PUT' });
}

// DELETE .../images/{imageId} — removes the file too. If it was the featured
// one, the lowest remaining sort_order is promoted. 404 if the image doesn't
// belong to this product.
export async function deleteProductImage(productId: number, imageId: number): Promise<void> {
  await apiRequest(`/admin/products/${productId}/images/${imageId}`, { method: 'DELETE' });
}
