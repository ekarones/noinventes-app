import { apiRequest } from '../client';
import type { AdminCompany } from '../../types';

// The issuer singleton (datos de la empresa) used to compose the receipt/invoice
// header server-side. Data is entered MANUALLY in the app — the RUC-lookup
// endpoint (`POST /admin/company/lookup`) is deliberately not wired up.

type RawCompany = {
  ruc: string;
  razon_social: string;
  nombre_comercial: string;
  direccion?: string | null;
  distrito?: string | null;
  provincia?: string | null;
  departamento?: string | null;
  ubigeo?: string | null;
  is_configured?: boolean;
};

function mapCompany(c: RawCompany): AdminCompany {
  return {
    ruc: c.ruc ?? '',
    razonSocial: c.razon_social ?? '',
    nombreComercial: c.nombre_comercial ?? '',
    direccion: c.direccion ?? null,
    distrito: c.distrito ?? null,
    provincia: c.provincia ?? null,
    departamento: c.departamento ?? null,
    ubigeo: c.ubigeo ?? null,
    isConfigured: Boolean(c.is_configured),
  };
}

// GET /admin/company — the issuer singleton, or null when the tenant hasn't
// configured it yet (fresh signup).
export async function fetchAdminCompany(): Promise<AdminCompany | null> {
  const res = await apiRequest<{ setting: RawCompany | null }>(`/admin/company`);
  return res.setting ? mapCompany(res.setting) : null;
}

export type CompanyPayload = {
  ruc: string;
  razonSocial: string;
  nombreComercial: string;
  direccion?: string | null;
  distrito?: string | null;
  provincia?: string | null;
  departamento?: string | null;
  ubigeo?: string | null;
};

// PUT /admin/company — save/replace the issuer data. The server enforces
// `ruc` = 11 digits and falls `nombre_comercial` back to `razon_social` if blank.
export async function updateAdminCompany(payload: CompanyPayload): Promise<void> {
  await apiRequest(`/admin/company`, {
    method: 'PUT',
    body: {
      ruc: payload.ruc,
      razon_social: payload.razonSocial,
      nombre_comercial: payload.nombreComercial,
      direccion: payload.direccion ?? null,
      distrito: payload.distrito ?? null,
      provincia: payload.provincia ?? null,
      departamento: payload.departamento ?? null,
      ubigeo: payload.ubigeo ?? null,
    },
  });
}
