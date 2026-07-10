import { apiRequest } from '../client';
import type { AdminBranch } from '../../types';

type RawBranch = {
  id: number;
  name: string;
  address?: string | null;
  active: boolean | number;
  sellers_count?: number;
};

function mapBranch(b: RawBranch): AdminBranch {
  return {
    id: b.id,
    name: b.name,
    address: b.address ?? null,
    // Laravel may serialize a tinyint boolean as 0/1.
    active: Boolean(b.active),
    sellersCount: b.sellers_count ?? 0,
  };
}

// GET /admin/branches — each branch with how many sellers are assigned to it.
export async function fetchAdminBranches(): Promise<AdminBranch[]> {
  const res = await apiRequest<{ data: RawBranch[] }>(`/admin/branches`);
  return (res.data ?? []).map(mapBranch);
}

export type BranchPayload = {
  name: string;
  address?: string | null;
  active: boolean;
};

// POST /admin/branches — the server seeds stock=0 rows across the whole catalog
// for the new branch, so it doesn't show up with "missing rows" in inventory.
export async function createBranch(payload: BranchPayload): Promise<void> {
  await apiRequest(`/admin/branches`, {
    method: 'POST',
    body: { name: payload.name, address: payload.address ?? null, active: payload.active },
  });
}

export async function updateBranch(id: number, payload: BranchPayload): Promise<void> {
  await apiRequest(`/admin/branches/${id}`, {
    method: 'PUT',
    body: { name: payload.name, address: payload.address ?? null, active: payload.active },
  });
}

export async function deleteBranch(id: number): Promise<void> {
  await apiRequest(`/admin/branches/${id}`, { method: 'DELETE' });
}
