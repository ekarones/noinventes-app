import { apiRequest } from '../client';
import type { AdminCategory } from '../../types';

// The server returns the full category tree. It may come nested (`children`)
// or flat (rows carrying `parent_id`) — we normalize both into a flat list
// ordered depth-first, each row tagged with its nesting `depth`.
type RawCategoryNode = {
  id: number;
  name: string;
  parent_id?: number | null;
  products_count?: number;
  children?: RawCategoryNode[];
};

function toRow(n: RawCategoryNode, depth: number, parentId: number | null, hasChildren: boolean): AdminCategory {
  return {
    id: n.id,
    name: n.name,
    parentId: n.parent_id ?? parentId,
    productsCount: n.products_count ?? 0,
    depth,
    hasChildren,
  };
}

// Nested shape → depth-first flatten.
function flattenNested(nodes: RawCategoryNode[], depth: number, parentId: number | null, out: AdminCategory[]): void {
  for (const n of nodes) {
    const children = n.children ?? [];
    out.push(toRow(n, depth, parentId, children.length > 0));
    if (children.length) flattenNested(children, depth + 1, n.id, out);
  }
}

// Flat shape → rebuild the tree from parent_id, then depth-first flatten.
function flattenFlat(nodes: RawCategoryNode[]): AdminCategory[] {
  const byParent = new Map<number | null, RawCategoryNode[]>();
  for (const n of nodes) {
    const p = n.parent_id ?? null;
    if (!byParent.has(p)) byParent.set(p, []);
    byParent.get(p)!.push(n);
  }

  const out: AdminCategory[] = [];
  const seen = new Set<number>();

  function walk(parentId: number | null, depth: number) {
    for (const n of byParent.get(parentId) ?? []) {
      if (seen.has(n.id)) continue; // guard against a cyclic parent_id
      seen.add(n.id);
      out.push(toRow(n, depth, parentId, (byParent.get(n.id) ?? []).length > 0));
      walk(n.id, depth + 1);
    }
  }
  walk(null, 0);

  // Any row whose parent isn't in the payload would be dropped — surface it at root.
  for (const n of nodes) {
    if (!seen.has(n.id)) out.push(toRow(n, 0, null, false));
  }
  return out;
}

function mapTree(nodes: RawCategoryNode[]): AdminCategory[] {
  const nested = nodes.some((n) => Array.isArray(n.children) && n.children.length > 0);
  if (nested) {
    const out: AdminCategory[] = [];
    flattenNested(nodes, 0, null, out);
    return out;
  }
  return flattenFlat(nodes);
}

// GET /admin/categories — full tree with products_count. `search` filters by name.
export async function fetchAdminCategories(search?: string): Promise<AdminCategory[]> {
  const q = search ? `?search=${encodeURIComponent(search)}` : '';
  const res = await apiRequest<{ data: RawCategoryNode[] }>(`/admin/categories${q}`);
  return mapTree(res.data ?? []);
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
