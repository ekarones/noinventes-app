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

type LoginResponse = {
  token: string;
  token_type: string;
  user: User;
};

type MeResponse = {
  user: User;
};

// POST /login — authenticates a seller and returns a token + profile.
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

// GET /me — validates the token is still alive and refreshes the profile/branch.
export async function fetchMe(token: string): Promise<User> {
  const data = await apiRequest<MeResponse>('/me', { token });
  return data.user;
}

// POST /logout — revokes only the current device's token.
export async function logout(token: string): Promise<void> {
  await apiRequest<{ message: string }>('/logout', { method: 'POST', token });
}
