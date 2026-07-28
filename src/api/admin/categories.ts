import { apiRequest } from '../client';
import type { AdminCategory } from '../../types';

// One shape, always: the flat list the server already ordered depth-first, each
// row carrying its `depth` and `has_children`. (It used to arrive either nested
// or flat, so the client had to sniff the shape and rebuild the tree itself.)
type RawCategoryNode = {
  id: number;
  name: string;
  parent_id: number | null;
  depth: number;
  has_children: boolean;
  products_count?: number;
};

// GET /admin/categories — same rows as the seller's, plus products_count.
// `search` filters by name; orphans (parent filtered out) come last at depth 0.
export async function fetchAdminCategories(search?: string): Promise<AdminCategory[]> {
  const q = search ? `?search=${encodeURIComponent(search)}` : '';
  const res = await apiRequest<{ data: RawCategoryNode[] }>(`/admin/categories${q}`);
  return (res.data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    parentId: c.parent_id,
    productsCount: c.products_count ?? 0,
    depth: c.depth,
    hasChildren: c.has_children,
  }));
}

// POST /admin/categories — 422 if the name duplicates a sibling.
export async function createCategory(name: string, parentId: number | null): Promise<void> {
  await apiRequest(`/admin/categories`, {
    method: 'POST',
    body: { name, parent_id: parentId },
  });
}

// PUT /admin/categories/{id} — 422 on a cycle (own parent or a descendant).
export async function updateCategory(
  id: number,
  name: string,
  parentId: number | null
): Promise<void> {
  await apiRequest(`/admin/categories/${id}`, {
    method: 'PUT',
    body: { name, parent_id: parentId },
  });
}

// DELETE /admin/categories/{id} — 422 if it has subcategories or products; the
// ApiError message says what to move first.
export async function deleteCategory(id: number): Promise<void> {
  await apiRequest(`/admin/categories/${id}`, { method: 'DELETE' });
}
