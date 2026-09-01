import { apiRequest } from '../client';
import { mapMeta } from '../products';
import type { PaginationMeta } from '../products';
import type { AdminSupplier } from '../../types';

type RawSupplier = {
  id: number;
  ruc: string;
  razon_social: string;
  nombre_comercial: string | null;
  display_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean | number;
};

function mapSupplier(s: RawSupplier): AdminSupplier {
  return {
    id: s.id,
    ruc: s.ruc,
    razonSocial: s.razon_social,
    nombreComercial: s.nombre_comercial ?? null,
    displayName: s.display_name,
    contactName: s.contact_name ?? null,
    email: s.email ?? null,
    phone: s.phone ?? null,
    address: s.address ?? null,
    notes: s.notes ?? null,
    // Laravel may serialize a tinyint boolean as 0/1.
    isActive: Boolean(s.is_active),
  };
}

export type SupplierStatusFilter = 'all' | 'active' | 'inactive';

export type FetchSuppliersParams = {
  search?: string;
  status?: SupplierStatusFilter;
  page?: number;
  perPage?: number;
};

// GET /admin/suppliers — paginated; `search` matches ruc / razón social /
// nombre comercial / contacto.
export async function fetchAdminSuppliers(
  params: FetchSuppliersParams = {}
): Promise<{ items: AdminSupplier[]; meta: PaginationMeta }> {
  const q = new URLSearchParams();
  if (params.search) q.set('search', params.search);
  if (params.status && params.status !== 'all') q.set('status', params.status);
  q.set('per_page', String(params.perPage ?? 20));
  q.set('page', String(params.page ?? 1));

  const res = await apiRequest<{
    data: RawSupplier[];
    meta: { current_page: number; last_page: number; per_page: number; total: number };
  }>(`/admin/suppliers?${q.toString()}`);

  return { items: res.data.map(mapSupplier), meta: mapMeta(res.meta) };
}

export type SupplierPayload = {
  ruc: string;
  razonSocial: string;
  nombreComercial?: string | null;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  isActive: boolean;
};

function body(p: SupplierPayload) {
  return {
    ruc: p.ruc,
    razon_social: p.razonSocial,
    nombre_comercial: p.nombreComercial || null,
    contact_name: p.contactName || null,
    email: p.email || null,
    phone: p.phone || null,
    address: p.address || null,
    notes: p.notes || null,
    is_active: p.isActive,
  };
}

// POST /admin/suppliers — 422 if the RUC isn't 11 digits or already exists in
// this tenant.
export async function createSupplier(payload: SupplierPayload): Promise<void> {
  await apiRequest(`/admin/suppliers`, { method: 'POST', body: body(payload) });
}

export async function updateSupplier(id: number, payload: SupplierPayload): Promise<void> {
  await apiRequest(`/admin/suppliers/${id}`, { method: 'PUT', body: body(payload) });
}

// DELETE /admin/suppliers/{id} — HARD delete. Blocked by the FK (server 500) if
// the supplier has purchase orders; deactivate (isActive:false) to keep history.
export async function deleteSupplier(id: number): Promise<void> {
  await apiRequest(`/admin/suppliers/${id}`, { method: 'DELETE' });
}
