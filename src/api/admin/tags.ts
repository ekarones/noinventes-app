import { apiRequest } from '../client';
import type { AdminTag } from '../../types';

type RawTag = { id: number; name: string; products_count?: number };

// GET /admin/tags — each tag with how many products use it.
export async function fetchAdminTags(): Promise<AdminTag[]> {
  const res = await apiRequest<{ data: RawTag[] }>(`/admin/tags`);
  return (res.data ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    productsCount: t.products_count ?? 0,
  }));
}

// POST /admin/tags — `name` must be unique (422 otherwise).
export async function createTag(name: string): Promise<void> {
  await apiRequest(`/admin/tags`, { method: 'POST', body: { name } });
}

export async function updateTag(id: number, name: string): Promise<void> {
  await apiRequest(`/admin/tags/${id}`, { method: 'PUT', body: { name } });
}

// DELETE /admin/tags/{id} — removes the pivot assignment on its products too.
export async function deleteTag(id: number): Promise<void> {
  await apiRequest(`/admin/tags/${id}`, { method: 'DELETE' });
}
