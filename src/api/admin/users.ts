import { apiRequest } from '../client';
import type { PaginationMeta } from '../products';
import type { AdminUser, AdminUserRole } from '../../types';

type RawUser = {
  id: number;
  name: string;
  email: string;
  role: AdminUserRole;
  branch?: { id: number; name: string } | null;
};

function mapUser(u: RawUser): AdminUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    branch: u.branch ?? null,
  };
}

export type FetchAdminUsersParams = {
  search?: string;
  role?: AdminUserRole;
  page?: number;
  perPage?: number;
};

// GET /admin/users — paginated; `search` matches the name.
export async function fetchAdminUsers(
  params: FetchAdminUsersParams = {}
): Promise<{ items: AdminUser[]; meta: PaginationMeta }> {
  const q = new URLSearchParams();
  if (params.search) q.set('search', params.search);
  if (params.role) q.set('role', params.role);
  q.set('per_page', String(params.perPage ?? 20));
  q.set('page', String(params.page ?? 1));

  const res = await apiRequest<{
    data: RawUser[];
    meta: { current_page: number; last_page: number; per_page: number; total: number };
  }>(`/admin/users?${q.toString()}`);

  return {
    items: res.data.map(mapUser),
    meta: {
      currentPage: res.meta.current_page,
      lastPage: res.meta.last_page,
      perPage: res.meta.per_page,
      total: res.meta.total,
    },
  };
}

export type UserPayload = {
  name: string;
  email: string;
  role: AdminUserRole;
  // Ignored by the server for admins (branch_id is nulled for non-sellers).
  branchId: number | null;
  // Required on create; omit on edit to keep the current password.
  password?: string;
};

function body(p: UserPayload) {
  const out: Record<string, unknown> = {
    name: p.name,
    email: p.email,
    role: p.role,
    branch_id: p.role === 'seller' ? p.branchId : null,
  };
  if (p.password) {
    out.password = p.password;
    out.password_confirmation = p.password;
  }
  return out;
}

// POST /admin/users — password rules are enforced server-side (strong in prod).
export async function createUser(payload: UserPayload): Promise<void> {
  await apiRequest(`/admin/users`, { method: 'POST', body: body(payload) });
}

// PUT /admin/users/{id} — omitting `password` keeps the existing hash.
export async function updateUser(id: number, payload: UserPayload): Promise<void> {
  await apiRequest(`/admin/users/${id}`, { method: 'PUT', body: body(payload) });
}

// DELETE /admin/users/{id} — 422 if you try to delete yourself.
export async function deleteUser(id: number): Promise<void> {
  await apiRequest(`/admin/users/${id}`, { method: 'DELETE' });
}
