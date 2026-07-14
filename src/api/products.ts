import { apiRequest } from './client';
import type { AttributeValue, Category, Product, Variation } from '../types';

export type PaginationMeta = {
  currentPage: number;
  lastPage: number;
  perPage: number;
  total: number;
};

// ---- Raw API shapes (as returned by the server) ----

type RawCategoryRef = { id: number; name: string } | null;

type RawProduct = {
  id: number;
  code: string;
  name: string;
  slug: string | null;
  type: 'simple' | 'variable';
  status: 'public' | 'published';
  unit_value: string;
  final_price: string;
  unit_of_measure: string;
  image_url: string | null;
  image_thumb_url?: string | null;
  // Detail-only; absent in the listing response.
  images?: {
    id: number;
    url: string;
    thumb_url?: string | null;
    is_featured: boolean;
    sort_order: number;
  }[];
  stock: number;
  variations_count: number;
  category: RawCategoryRef;
};

type RawVariation = {
  id: number;
  code: string;
  unit_value: string;
  final_price: string;
  image_url: string | null;
  image_thumb_url?: string | null;
  stock: number;
  attribute_values: AttributeValue[];
};

type RawCategory = { id: number; parent_id: number | null; name: string };

type ProductsResponse = {
  data: RawProduct[];
  meta: { current_page: number; last_page: number; per_page: number; total: number };
};

// ---- Mappers ----

function mapProduct(p: RawProduct): Product {
  return {
    id: p.id,
    code: p.code,
    name: p.name,
    slug: p.slug,
    type: p.type,
    status: p.status,
    unitValue: parseFloat(p.unit_value),
    finalPrice: parseFloat(p.final_price),
    unitOfMeasure: p.unit_of_measure,
    imageUrl: p.image_url,
    // Fall back to the full image if the server sends no thumb (older build).
    imageThumbUrl: p.image_thumb_url ?? p.image_url,
    // Empty from the listing; the detail endpoint fills it.
    images: (p.images ?? []).map((i) => ({
      id: i.id,
      url: i.url,
      thumbUrl: i.thumb_url ?? i.url,
      isFeatured: i.is_featured,
      sortOrder: i.sort_order,
    })),
    stock: p.stock,
    variationsCount: p.variations_count,
    category: p.category,
  };
}

function mapVariation(v: RawVariation): Variation {
  return {
    id: v.id,
    code: v.code,
    unitValue: parseFloat(v.unit_value),
    finalPrice: parseFloat(v.final_price),
    imageUrl: v.image_url,
    imageThumbUrl: v.image_thumb_url ?? v.image_url,
    stock: v.stock,
    attributeValues: v.attribute_values ?? [],
  };
}

// ---- Endpoints ----

// Server-side whitelist. Anything else falls back to the API default (`name`
// for the seller catalog).
export type ProductSortBy = 'id' | 'created_at' | 'name' | 'code' | 'final_price';
export type SortDir = 'asc' | 'desc';

export type FetchProductsParams = {
  search?: string;
  categoryId?: number | null;
  sortBy?: ProductSortBy;
  sortDir?: SortDir;
  page?: number;
  perPage?: number;
};

export async function fetchProducts(
  params: FetchProductsParams = {}
): Promise<{ items: Product[]; meta: PaginationMeta }> {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.categoryId) query.set('category_id', String(params.categoryId));
  if (params.sortBy) query.set('sort_by', params.sortBy);
  if (params.sortDir) query.set('sort_dir', params.sortDir);
  query.set('per_page', String(params.perPage ?? 30));
  query.set('page', String(params.page ?? 1));

  const res = await apiRequest<ProductsResponse>(`/products?${query.toString()}`);
  return {
    items: res.data.map(mapProduct),
    meta: {
      currentPage: res.meta.current_page,
      lastPage: res.meta.last_page,
      perPage: res.meta.per_page,
      total: res.meta.total,
    },
  };
}

// GET /products/{id} — full product detail (branch-contextualized). Used to open
// a product's detail from places that only have its id (e.g. the dashboard "top
// products"). For variable products the server returns final_price = "desde"
// (min of its variations). Throws ApiError 404 if it no longer exists / isn't
// visible to the seller.
export async function fetchProduct(id: number): Promise<Product> {
  const res = await apiRequest<{ product: RawProduct }>(`/products/${id}`);
  return mapProduct(res.product);
}

export async function fetchVariations(productId: number): Promise<Variation[]> {
  const res = await apiRequest<{ data: RawVariation[] }>(`/products/${productId}/variations`);
  return res.data.map(mapVariation);
}

// GET /lookup — resolves a scanned QR code to a simple product or a variation
// (+ its parent). Throws ApiError: 422 if the code is a variable parent, 404 if
// not found.
export type LookupResult =
  | { type: 'product'; product: Product; variation: null }
  | { type: 'variation'; product: Product; variation: Variation };

export async function lookupByCode(code: string): Promise<LookupResult> {
  const res = await apiRequest<{
    type: 'product' | 'variation';
    product: RawProduct;
    variation: RawVariation | null;
  }>(`/lookup?code=${encodeURIComponent(code)}`);

  const product = mapProduct(res.product);
  if (res.type === 'variation' && res.variation) {
    return { type: 'variation', product, variation: mapVariation(res.variation) };
  }
  return { type: 'product', product, variation: null };
}

export async function fetchCategories(): Promise<Category[]> {
  const res = await apiRequest<{ data: RawCategory[] }>(`/categories`);
  return res.data.map((c) => ({ id: c.id, parentId: c.parent_id, name: c.name }));
}
