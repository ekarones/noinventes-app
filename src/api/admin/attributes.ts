import { apiRequest } from '../client';
import type { AdminAttribute } from '../../types';

type RawAttributeValue = { id: number; value: string; position?: number };
type RawAttribute = { id: number; name: string; values?: RawAttributeValue[] };

function mapAttribute(a: RawAttribute): AdminAttribute {
  return {
    id: a.id,
    name: a.name,
    values: (a.values ?? []).map((v, i) => ({
      id: v.id,
      value: v.value,
      position: v.position ?? i,
    })),
  };
}

// GET /admin/attributes — each attribute with its values ordered by position.
export async function fetchAdminAttributes(): Promise<AdminAttribute[]> {
  const res = await apiRequest<{ data: RawAttribute[] }>(`/admin/attributes`);
  return (res.data ?? []).map(mapAttribute);
}

// POST /admin/attributes — each string's index in `values` becomes its position.
export async function createAttribute(name: string, values: string[]): Promise<void> {
  await apiRequest(`/admin/attributes`, { method: 'POST', body: { name, values } });
}

// PUT /admin/attributes/{id} — the server DIFF-SYNCS `values` BY STRING: values
// that survive keep their id, missing ones are deleted (422 if a variation still
// uses them), new ones are inserted.
//
// IMPORTANT: never use this to rename a value — the old string would look
// "removed" and the new one "added", destroying its id. Call
// `renameAttributeValue` first, then pass the post-rename strings here.
export async function updateAttribute(
  id: number,
  name: string,
  values: string[]
): Promise<void> {
  await apiRequest(`/admin/attributes/${id}`, { method: 'PUT', body: { name, values } });
}

export async function deleteAttribute(id: number): Promise<void> {
  await apiRequest(`/admin/attributes/${id}`, { method: 'DELETE' });
}

// PUT /admin/attributes/{a}/values/{v} — renames ONE value by id, bypassing the
// diff, so variations pointing at that id stay valid.
export async function renameAttributeValue(
  attributeId: number,
  valueId: number,
  value: string
): Promise<void> {
  await apiRequest(`/admin/attributes/${attributeId}/values/${valueId}`, {
    method: 'PUT',
    body: { value },
  });
}
