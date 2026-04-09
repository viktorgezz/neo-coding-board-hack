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

type MockAuthRole = 'admin' | 'hr' | 'interviewer';

interface MockAccount {
  email: string;
  password: string;
  role: MockAuthRole;
  name: string;
  sub: string;
}

const MOCK_ACCOUNTS: readonly MockAccount[] = [
  {
    email: 'admin@neo.local',
    password: 'admin123',
    role: 'admin',
    name: 'Demo Admin',
    sub: 'mock-admin-1',
  },
  {
    email: 'hr@neo.local',
    password: 'hr123',
    role: 'hr',
    name: 'Demo HR',
    sub: 'mock-hr-1',
  },
  {
    email: 'interviewer@neo.local',
    password: 'interviewer123',
    role: 'interviewer',
    name: 'Demo Interviewer',
    sub: 'mock-interviewer-1',
  },
] as const;

function toBase64Url(data: string): string {
  return btoa(data).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function createMockJwt(role: MockAuthRole, sub: string, lifetimeSeconds: number): string {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    sub,
    role,
    iat: now,
    exp: now + lifetimeSeconds,
  };
  // Signature is intentionally fake for mock/dev mode; frontend only decodes payload.
  return `${toBase64Url(JSON.stringify(header))}.${toBase64Url(JSON.stringify(payload))}.mock-signature`;
}

function tryMockLogin(username: string, password: string): LoginResponse | null {
  const normalizedLogin = username.trim().toLowerCase();
  const normalizedPassword = password.trim();
  const account = MOCK_ACCOUNTS.find(
    (item) => item.email === normalizedLogin && item.password === normalizedPassword,
  );
  if (!account) {
    return null;
  }

  const tokenAccess = createMockJwt(account.role, account.sub, 60 * 60 * 8);
  const tokenRefresh = createMockJwt(account.role, account.sub, 60 * 60 * 24 * 7);

  return {
    tokenAccess,
    tokenRefresh,
    name: account.name,
  };
}

/**
 * POST /api/v1/auth/login
 *
 * @param username — login string (email-style or plain username, per backend)
 */
export async function apiLogin(
  username: string,
  password: string,
): Promise<LoginResponse> {
  if (import.meta.env.DEV) {
    if (username.trim().toLowerCase() === 'candidate@neo.local' && password.trim() === 'candidate123') {
      throw new Error('Candidate uses /session/:id/join flow, not /login');
    }

    const mock = tryMockLogin(username, password);
    if (mock !== null) {
      return mock;
    }
  }

  // Backend field is "name" (login / username, not necessarily an email)
  const res = await fetch('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: username.trim(), password }),
  });

  if (!res.ok) {
    throw new Error(res.statusText || String(res.status));
  }

  // Real API returns snake_case: access_token, refresh_token, token_type
  // Normalize to camelCase that the rest of the frontend expects
  const raw = await res.json() as {
    access_token?: string;  tokenAccess?: string;
    refresh_token?: string; tokenRefresh?: string;
    name?: string;
  };

  const tokenAccess  = raw.access_token  ?? raw.tokenAccess  ?? '';
  const tokenRefresh = raw.refresh_token ?? raw.tokenRefresh ?? '';
  // API doesn't return a display name — decode sub (username) from the JWT payload
  const sub = tokenAccess ? (JSON.parse(atob(tokenAccess.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))) as {sub?: string}).sub ?? '' : '';

  return { tokenAccess, tokenRefresh, name: raw.name ?? sub };
}
