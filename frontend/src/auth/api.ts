/**
 * Auth API — the single fetch call this module owns.
 *
 * Token refresh is NOT here. That lives in the axios interceptor layer
 * (src/lib/apiClient.ts). This file only handles initial credential exchange.
 */

export interface LoginResponse {
  tokenAccess: string;
  tokenRefresh: string;
  /** Display name for the authenticated user, shown in the sidebar. */
  name: string;
}

/**
 * POST /api/v1/auth/login
 *
 * Throws an Error with res.statusText on any non-2xx response so the caller
 * (LoginPage) can catch and surface a human-readable message.
 */
export async function apiLogin(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const res = await fetch('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    throw new Error(res.statusText || String(res.status));
  }

  return res.json() as Promise<LoginResponse>;
}
