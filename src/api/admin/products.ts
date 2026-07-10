import { apiRequest } from '../client';
import { filePart } from '../upload';
import type { PaginationMeta } from '../products';
import type {
  AdminProductDetail,
  AdminProductImage,
  AdminProductRow,
  AdminProductStatus,
  AdminVariation,
  AttributeValue,
  CategoryRef,
  ProductType,
  StockByBranch,
} from '../../types';

// ---- Raw shapes (snake_case + string decimals) ----

type RawStockByBranch = { branch_id: number; branch_name: string; stock: number };

type RawAdminProductRow = {
  id: number;
  code: string;
  name: string;
  type: ProductType;
  status: AdminProductStatus;
  unit_value: string;
  final_price: string;
  unit_of_measure: string;
  image_url: string | null;
  variations_count: number;
  category: { id: number; name: string } | null;
  stock?: number | null;
};

type RawAdminImage = {
  id: number;
  url: string;
  is_featured: boolean;
  sort_order: number;
};

type RawProductAttribute = {
  id: number;
  name: string;
  values?: { id: number; value: string }[];
};

type RawAdminProductDetail = {
  id: number;
  code: string;
  name: string;
  slug: string | null;
  description: string | null;
  short_description: string | null;
  type: ProductType;
  status: AdminProductStatus;
  unit_value: string;
  final_price: string;
  unit_of_measure: string;
  variations_count: number;
  category: { id: number; name: string } | null;
  tags?: { id: number; name: string }[];
  images?: RawAdminImage[];
  stock_by_branch?: RawStockByBranch[];
  attributes?: RawProductAttribute[];
};

type RawAdminVariation = {
  id: number;
  code: string;
  unit_value: string;
  final_price: string;
  // Returned by index/store/update (shared shape). Optional + defensive in case
  // an older server build omits it; `null` when the variation has no image.
  image_url?: string | null;
  attribute_values?: AttributeValue[];
  stock_by_branch?: RawStockByBranch[];
};

// ---- Mappers ----

function mapStock(s: RawStockByBranch): StockByBranch {
  return { branchId: s.branch_id, branchName: s.branch_name, stock: s.stock };
}

function mapImage(i: RawAdminImage): AdminProductImage {
  return { id: i.id, url: i.url, isFeatured: i.is_featured, sortOrder: i.sort_order };
}

function mapRow(p: RawAdminProductRow): AdminProductRow {
  return {
    id: p.id,
    code: p.code,
    name: p.name,
    type: p.type,
    status: p.status,
    unitValue: parseFloat(p.unit_value),
    finalPrice: parseFloat(p.final_price),
    unitOfMeasure: p.unit_of_measure,
    imageUrl: p.image_url,
    variationsCount: p.variations_count,
    category: p.category as CategoryRef | null,
    stock: p.stock ?? null,
  };
}

function mapDetail(p: RawAdminProductDetail): AdminProductDetail {
  return {
    id: p.id,
    code: p.code,
    name: p.name,
    slug: p.slug,
    description: p.description,
    shortDescription: p.short_description,
    type: p.type,
    status: p.status,
    unitValue: parseFloat(p.unit_value),
    finalPrice: parseFloat(p.final_price),
    unitOfMeasure: p.unit_of_measure,
    variationsCount: p.variations_count,
    category: p.category as CategoryRef | null,
    tags: p.tags ?? [],
    images: (p.images ?? []).map(mapImage),
    stockByBranch: (p.stock_by_branch ?? []).map(mapStock),
    attributes: (p.attributes ?? []).map((a) => ({
      id: a.id,
      name: a.name,
      values: a.values ?? [],
    })),
  };
}

function mapVariation(v: RawAdminVariation): AdminVariation {
  return {
    id: v.id,
    code: v.code,
    unitValue: parseFloat(v.unit_value),
    finalPrice: parseFloat(v.final_price),
    imageUrl: v.image_url ?? null,
    attributeValues: v.attribute_values ?? [],
    stockByBranch: (v.stock_by_branch ?? []).map(mapStock),
  };
}

// ---- Endpoints ----

export type FetchAdminProductsParams = {
  search?: string;
  categoryId?: number | null;
  status?: AdminProductStatus;
  page?: number;
  perPage?: number;
};

export async function fetchAdminProducts(
  params: FetchAdminProductsParams = {}
): Promise<{ items: AdminProductRow[]; meta: PaginationMeta }> {
  const q = new URLSearchParams();
  if (params.search) q.set('search', params.search);
  if (params.categoryId) q.set('category_id', String(params.categoryId));
  if (params.status) q.set('status', params.status);
  q.set('per_page', String(params.perPage ?? 30));
  q.set('page', String(params.page ?? 1));

  const res = await apiRequest<{
    data: RawAdminProductRow[];
    meta: { current_page: number; last_page: number; per_page: number; total: number };
  }>(`/admin/products?${q.toString()}`);

  return {
    items: res.data.map(mapRow),
    meta: {
      currentPage: res.meta.current_page,
      lastPage: res.meta.last_page,
      perPage: res.meta.per_page,
      total: res.meta.total,
    },
  };
}

export async function fetchAdminProductDetail(id: number): Promise<AdminProductDetail> {
  const res = await apiRequest<{ product: RawAdminProductDetail }>(`/admin/products/${id}`);
  return mapDetail(res.product);
}

export async function fetchAdminProductVariations(productId: number): Promise<AdminVariation[]> {
  const res = await apiRequest<{ data: RawAdminVariation[] }>(
    `/admin/products/${productId}/variations`
  );
  return res.data.map(mapVariation);
}

// ---- Product CRUD ----

export type ProductPayload = {
  code: string;
  name: string;
  slug?: string | null;
  description?: string | null;
  shortDescription?: string | null;
  status: AdminProductStatus;
  type: ProductType;
  categoryId: number | null;
  unitValue: number;
  finalPrice: number;
  unitOfMeasure: string;
  tagIds: number[];
  // Create-only, and only for `variable` products: the attributes assigned to
  // the product (pivot `product_attribute`). Without them the server can't
  // validate attribute coverage, so later POST /variations fail with 422.
  attributeIds?: number[];
};

// Array fields have to be sent as repeated `name[]` entries in multipart, so
// they're kept out of the scalar map and appended separately.
const ARRAY_FIELDS = ['tag_ids', 'attribute_ids'];

// Flat field map shared by the JSON and multipart paths. `withAttributes` is
// false on update — PUT only edits metadata + tags.
function productFields(p: ProductPayload, withAttributes: boolean): Record<string, unknown> {
  const fields: Record<string, unknown> = {
    code: p.code,
    name: p.name,
    slug: p.slug || null,
    description: p.description || null,
    short_description: p.shortDescription || null,
    status: p.status,
    type: p.type,
    category_id: p.categoryId,
    unit_value: p.unitValue,
    final_price: p.finalPrice,
    unit_of_measure: p.unitOfMeasure,
    tag_ids: p.tagIds,
  };
  if (withAttributes && p.type === 'variable' && p.attributeIds?.length) {
    fields.attribute_ids = p.attributeIds;
  }
  return fields;
}

// When a featured image is attached the request has to be multipart, so scalars
// become strings and array fields are repeated as `name[]` entries.
function productFormData(p: ProductPayload, imageUri: string, withAttributes: boolean): FormData {
  const form = new FormData();
  const fields = productFields(p, withAttributes);

  for (const [key, value] of Object.entries(fields)) {
    if (ARRAY_FIELDS.includes(key)) continue;
    if (value === null || value === undefined) continue;
    form.append(key, String(value));
  }
  for (const key of ARRAY_FIELDS) {
    const list = fields[key] as number[] | undefined;
    for (const id of list ?? []) form.append(`${key}[]`, String(id));
  }

  form.append('image', filePart(imageUri));
  return form;
}

// The create response isn't pinned down by the API docs, so read the id from
// either envelope shape and fall back to null (the caller just skips the
// follow-up navigation then).
type CreatedProduct = { product?: { id?: number }; id?: number };

function createdId(res: CreatedProduct | null | undefined): number | null {
  return res?.product?.id ?? res?.id ?? null;
}

// POST /admin/products — creates the product shell, seeds stock=0 on every
// branch, and (for variable products) pins `attribute_ids` on the pivot so the
// later POST /variations can validate attribute coverage. Variations themselves
// are added separately via createVariation(). Returns the new product's id when
// the server reports it.
export async function createProduct(
  payload: ProductPayload,
  imageUri?: string
): Promise<number | null> {
  const body = imageUri
    ? productFormData(payload, imageUri, true)
    : productFields(payload, true);
  const res = await apiRequest<CreatedProduct>(`/admin/products`, { method: 'POST', body });
  return createdId(res);
}

// PUT /admin/products/{id} — edits metadata + tags. A new `image` replaces the
// featured one (the old file is deleted). Multipart can't be sent as PUT, so the
// upload path POSTs with `_method=PUT` (Laravel's method spoofing).
export async function updateProduct(
  id: number,
  payload: ProductPayload,
  imageUri?: string
): Promise<void> {
  // No attribute_ids here — PUT only edits metadata + tags, and the product's
  // attribute set is fixed at creation (and by its variations).
  if (imageUri) {
    const form = productFormData(payload, imageUri, false);
    form.append('_method', 'PUT');
    await apiRequest(`/admin/products/${id}`, { method: 'POST', body: form });
    return;
  }
  await apiRequest(`/admin/products/${id}`, { method: 'PUT', body: productFields(payload, false) });
}

// DELETE /admin/products/{id} — soft-delete; the product moves to the trash.
export async function deleteProduct(id: number): Promise<void> {
  await apiRequest(`/admin/products/${id}`, { method: 'DELETE' });
}

export async function fetchAdminProductsTrash(
  params: { page?: number; perPage?: number } = {}
): Promise<{ items: AdminProductRow[]; meta: PaginationMeta }> {
  const q = new URLSearchParams();
  q.set('per_page', String(params.perPage ?? 20));
  q.set('page', String(params.page ?? 1));

  const res = await apiRequest<{
    data: RawAdminProductRow[];
    meta: { current_page: number; last_page: number; per_page: number; total: number };
  }>(`/admin/products/trash?${q.toString()}`);

  return {
    items: res.data.map(mapRow),
    meta: {
      currentPage: res.meta.current_page,
      lastPage: res.meta.last_page,
      perPage: res.meta.per_page,
      total: res.meta.total,
    },
  };
}

export async function restoreProduct(id: number): Promise<void> {
  await apiRequest(`/admin/products/${id}/restore`, { method: 'POST' });
}

// DELETE /admin/products/{id}/force — permanent: removes the image file from
// disk and cascades pivots, variations and images. Not reversible. Sale items
// that referenced it are detached (SET NULL) but keep their snapshot, so past
// receipts stay intact.
export async function forceDeleteProduct(id: number): Promise<void> {
  await apiRequest(`/admin/products/${id}/force`, { method: 'DELETE' });
}

// ---- Variation mutations ----

export type CreateVariationPayload = {
  code: string;
  unitValue: number;
  finalPrice: number;
  // One value id per attribute. Must cover EXACTLY the attribute set the
  // product already uses (no more, no less) — the server 422s otherwise.
  attributeValueIds: number[];
};

// POST /admin/products/{id}/variations — 422 if the product isn't `variable`,
// if the attribute set doesn't match, if the combo collides, or if `code` dupes.
// An optional reference `image` is sent as multipart (same convention as
// createProduct); without it the request goes out as plain JSON.
export async function createVariation(
  productId: number,
  payload: CreateVariationPayload,
  imageUri?: string
): Promise<void> {
  const path = `/admin/products/${productId}/variations`;

  if (imageUri) {
    const form = new FormData();
    form.append('code', payload.code);
    form.append('unit_value', String(payload.unitValue));
    form.append('final_price', String(payload.finalPrice));
    for (const id of payload.attributeValueIds) form.append('attribute_values[]', String(id));
    form.append('image', filePart(imageUri));
    await apiRequest(path, { method: 'POST', body: form });
    return;
  }

  await apiRequest(path, {
    method: 'POST',
    body: {
      code: payload.code,
      unit_value: payload.unitValue,
      final_price: payload.finalPrice,
      attribute_values: payload.attributeValueIds,
    },
  });
}

// PUT /admin/product-variations/{id} — edits code + prices (the attribute combo
// is immutable). 422 on a duplicate code within the product. A new `image`
// replaces the reference photo; since multipart can't be sent as PUT, that path
// POSTs with `_method=PUT` (Laravel method spoofing), same as updateProduct.
export async function updateVariation(
  variationId: number,
  payload: { code: string; unitValue: number; finalPrice: number },
  imageUri?: string
): Promise<void> {
  const path = `/admin/product-variations/${variationId}`;

  if (imageUri) {
    const form = new FormData();
    form.append('code', payload.code);
    form.append('unit_value', String(payload.unitValue));
    form.append('final_price', String(payload.finalPrice));
    form.append('image', filePart(imageUri));
    form.append('_method', 'PUT');
    await apiRequest(path, { method: 'POST', body: form });
    return;
  }

  await apiRequest(path, {
    method: 'PUT',
    body: {
      code: payload.code,
      unit_value: payload.unitValue,
      final_price: payload.finalPrice,
    },
  });
}

// DELETE /admin/product-variations/{id} — always deletes (plus its image). Any
// sale_item pointing at it is detached via the FK's SET NULL; its snapshot
// (product_code, product_name, unit_price) survives, so historical receipts
// still render.
export async function deleteVariation(variationId: number): Promise<void> {
  await apiRequest(`/admin/product-variations/${variationId}`, { method: 'DELETE' });
}

// ---- Stock editing (merge semantics — unsent branches keep their stock) ----

// `stock` maps branchId → new quantity. Only the branches you include are
// changed; the rest are left untouched (server merges, doesn't wipe).
function stockBody(stock: Record<number, number>): { stock: Record<string, number> } {
  const out: Record<string, number> = {};
  for (const [branchId, qty] of Object.entries(stock)) out[branchId] = qty;
  return { stock: out };
}

export async function updateProductStock(
  productId: number,
  stock: Record<number, number>
): Promise<StockByBranch[]> {
  const res = await apiRequest<{ stock_by_branch: RawStockByBranch[] }>(
    `/admin/products/${productId}/stock`,
    { method: 'PUT', body: stockBody(stock) }
  );
  return (res.stock_by_branch ?? []).map(mapStock);
}

export async function updateVariationStock(
  variationId: number,
  stock: Record<number, number>
): Promise<StockByBranch[]> {
  const res = await apiRequest<{ stock_by_branch: RawStockByBranch[] }>(
    `/admin/product-variations/${variationId}/stock`,
    { method: 'PUT', body: stockBody(stock) }
  );
  return (res.stock_by_branch ?? []).map(mapStock);
}
