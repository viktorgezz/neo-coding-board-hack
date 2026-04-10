/**
 * AuthContext — context + provider for staff authentication.
 *
 * NOT used by candidates. Candidate auth lives entirely in
 * src/lib/candidateSession.ts.
 *
 * This file is intentionally not exported as a public surface:
 *   - Use `useAuth` from src/auth/useAuth.ts
 *   - Use `AuthProvider` from this file (re-exported via useAuth.ts)
 */

import {
  createContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';

import type { AuthRole } from '@/constants/roles';
import { decodeJWT, isTokenExpired } from './jwt';
import { apiLogin } from './api';
import {
  persistStaffSession,
  clearStaffSessionStorage,
  readStaffSessionFromStorage,
} from './staffSessionStorage';
import { bindStaffFetchDeps } from './staffAuthedFetch';

// ---------------------------------------------------------------------------
// Module-level token refs
// ---------------------------------------------------------------------------

/**
 * Module-level refs for axios and sync access. Синхронизируются с localStorage:
 * после login() и при старте приложения (восстановление после F5).
 * Сбрасываются только при logout() или истечении токена.
 */
let _tokenAccess: string | null = null;
let _tokenRefresh: string | null = null;

/**
 * User display name — stored alongside tokens for the same reason.
 * Not derivable from the JWT payload (JWT only carries sub/role/exp/iat).
 * Comes from the login API response body and survives re-mounts.
 */
let _userName: string | null = null;

/** Read-only accessor for the axios interceptor layer. */
export function getAccessToken(): string | null {
  return _tokenAccess;
}

/** Read-only accessor for the axios interceptor layer (token refresh use-case). */
export function getRefreshToken(): string | null {
  return _tokenRefresh;
}

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

export interface AuthContextValue {
  token: string | null;
  role: AuthRole | null;
  /** Display name returned by the login API. Null before first login. */
  name: string | null;
  /**
   * JWT subject claim — used as the user's stable identifier.
   * Exposed so the admin page can guard against self-deletion.
   * Null before first login.
   */
  userId: string | null;
  isAuthenticated: boolean;
  /**
   * Calls POST /api/v1/auth/login, stores tokens in module refs, updates
   * context state, and returns the decoded AuthRole so callers can navigate
   * without re-reading the hook (which would be a Rules-of-Hooks violation
   * inside an async callback).
   */
  login: (username: string, password: string) => Promise<AuthRole>;
  logout: () => void;
  /** POST /api/v1/auth/refresh — новый access, без редиректа. false если refresh невозможен. */
  refreshSession: () => Promise<boolean>;
}

// Sentinel — distinguishes "not yet provided" from a null-valued context
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ---------------------------------------------------------------------------
// Internal state shape — single object batches all updates into one render
// ---------------------------------------------------------------------------

interface AuthSessionState {
  token: string | null;
  role: AuthRole | null;
  name: string | null;
  userId: string | null;
  isAuthenticated: boolean;
}

const UNAUTHENTICATED: AuthSessionState = {
  token: null,
  role: null,
  name: null,
  userId: null,
  isAuthenticated: false,
};

function hydrateStateFromStorage(): AuthSessionState {
  const stored = readStaffSessionFromStorage();
  if (!stored) return UNAUTHENTICATED;

  const payload = decodeJWT(stored.tokenAccess);
  if (!payload || isTokenExpired(payload)) {
    clearStaffSessionStorage();
    return UNAUTHENTICATED;
  }

  _tokenAccess = stored.tokenAccess;
  _tokenRefresh = stored.tokenRefresh;
  _userName = stored.name || null;

  return {
    token:           stored.tokenAccess,
    role:            payload.role,
    name:            stored.name || null,
    userId:          payload.sub,
    isAuthenticated: true,
  };
}

// ---------------------------------------------------------------------------
// AuthProvider
// ---------------------------------------------------------------------------

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthSessionState>(() => hydrateStateFromStorage());

  // StrictMode / редкий ре-моунт: если ref уже есть, а state потерялся — подтянуть.
  useEffect(() => {
    if (state.isAuthenticated) return;
    if (_tokenAccess === null) return;

    const payload = decodeJWT(_tokenAccess);
    if (!payload || isTokenExpired(payload)) {
      _tokenAccess = null;
      _tokenRefresh = null;
      _userName = null;
      clearStaffSessionStorage();
      return;
    }

    setState({
      token: _tokenAccess,
      role: payload.role,
      name: _userName,
      userId: payload.sub,
      isAuthenticated: true,
    });
  }, [state.isAuthenticated]);

  // ── login ─────────────────────────────────────────────────────────────────

  const refreshSession = useCallback(async (): Promise<boolean> => {
    const refreshTok =
      _tokenRefresh ?? readStaffSessionFromStorage()?.tokenRefresh ?? '';
    if (!refreshTok) return false;
    try {
      const res = await fetch('/api/v1/auth/refresh', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ refreshToken: refreshTok }),
      });
      if (!res.ok) return false;
      const raw = (await res.json()) as { access_token?: string };
      const tokenAccess = raw.access_token ?? '';
      if (!tokenAccess) return false;
      const payload = decodeJWT(tokenAccess);
      if (!payload || isTokenExpired(payload)) return false;
      _tokenAccess = tokenAccess;
      const displayName =
        _userName ?? readStaffSessionFromStorage()?.name ?? '';
      persistStaffSession(tokenAccess, refreshTok, displayName);
      setState({
        token:           tokenAccess,
        role:            payload.role,
        name:            displayName || null,
        userId:          payload.sub,
        isAuthenticated: true,
      });
      return true;
    } catch {
      return false;
    }
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<AuthRole> => {
    // apiLogin throws on non-2xx — let it propagate to the caller (LoginPage)
    const { tokenAccess, tokenRefresh, name } = await apiLogin(username, password);

    const payload = decodeJWT(tokenAccess);
    if (!payload || isTokenExpired(payload)) {
      throw new Error('Invalid token received from server');
    }

    // Write module refs first so the interceptor layer sees them immediately
    _tokenAccess = tokenAccess;
    _tokenRefresh = tokenRefresh;
    _userName = name;

    // Single setState call — one re-render, no intermediate null flash
    setState({
      token: tokenAccess,
      role: payload.role,
      name,
      userId: payload.sub,
      isAuthenticated: true,
    });

    persistStaffSession(tokenAccess, tokenRefresh, name);

    // Return the role so callers can navigate without calling useAuth() again
    // inside an async callback (which would violate the Rules of Hooks).
    return payload.role;
  }, []);

  // ── logout ────────────────────────────────────────────────────────────────

  const logout = useCallback((): void => {
    _tokenAccess = null;
    _tokenRefresh = null;
    _userName = null;
    clearStaffSessionStorage();
    setState(UNAUTHENTICATED);
  }, []);

  useEffect(() => {
    bindStaffFetchDeps(() => _tokenAccess, refreshSession);
  }, [refreshSession]);

  // ── Context value — memoized to prevent needless consumer re-renders ──────

  const value = useMemo<AuthContextValue>(
    () => ({
      token: state.token,
      role: state.role,
      name: state.name,
      userId: state.userId,
      isAuthenticated: state.isAuthenticated,
      login,
      logout,
      refreshSession,
    }),
    [state.token, state.role, state.name, state.userId, state.isAuthenticated, login, logout, refreshSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ---------------------------------------------------------------------------
// Internal accessor — only useAuth.ts consumes this
// ---------------------------------------------------------------------------

export { AuthContext };
