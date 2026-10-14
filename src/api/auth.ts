import { apiRequest } from './client';

// Types mirror the Sellers API responses.
export type Branch = {
  id: number;
  name: string;
};

// `/api/mobile/login` accepts both sellers and admins. Admins come back with
// `role: 'admin'` and `branch: null` (they have no branch); their token only
// clears the identity endpoints (`/me`, `/logout`) — business endpoints 403.
export type UserRole = 'seller' | 'admin';

export type User = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  branch: Branch | null;
};

export type PlanName = 'basic' | 'pro' | 'business';

// The tenant's commercial plan + which features it unlocks. Returned by login
// and /me. Gate premium UI on `features.<name>` (e.g. `features.culqi`), never on
// `plan === 'pro'` — new plans/features are added to the map without breaking us.
export type TenantInfo = {
  id: number;
  subdomain: string;
  name: string;
  plan: PlanName;
  features: { culqi?: boolean } & Record<string, boolean>;
};

type LoginResponse = {
  token: string;
  token_type: string;
  user: User;
  tenant?: TenantInfo | null;
};

type MeResponse = {
  user: User;
  tenant?: TenantInfo | null;
};

// POST /login — authenticates a seller and returns a token + profile + plan.
export async function login(
  email: string,
  password: string,
  deviceName: string
): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/login', {
    method: 'POST',
    body: { email, password, device_name: deviceName },
  });
}

// GET /me — validates the token is still alive and refreshes profile + plan.
export async function fetchMe(token: string): Promise<{ user: User; tenant: TenantInfo | null }> {
  const data = await apiRequest<MeResponse>('/me', { token });
  return { user: data.user, tenant: data.tenant ?? null };
}

// POST /logout — revokes only the current device's token.
export async function logout(token: string): Promise<void> {
  await apiRequest<{ message: string }>('/logout', { method: 'POST', token });
}
