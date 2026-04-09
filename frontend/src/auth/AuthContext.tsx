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

// ---------------------------------------------------------------------------
// Module-level token refs
// ---------------------------------------------------------------------------

/**
 * Intentionally not persisted. Page refresh = re-login. Security requirement.
 *
 * These variables live outside React state so they:
 *   (a) survive AuthProvider re-mounts without resetting (e.g. React StrictMode
 *       double-invoke in development, or parent tree reconstructions), and
 *   (b) are accessible synchronously from the axios interceptor layer without
 *       going through a hook or context read.
 *
 * They are NEVER written to localStorage, sessionStorage, or any cookie.
 * The only way to populate them is a successful login() call.
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

// ---------------------------------------------------------------------------
// AuthProvider
// ---------------------------------------------------------------------------

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthSessionState>(UNAUTHENTICATED);

  // ── Init check ────────────────────────────────────────────────────────────
  //
  // Runs once on mount (or re-mount). If the module refs still hold values
  // from before this provider instance existed (e.g. React StrictMode
  // double-invoke in development, or parent tree reconstructions), validate
  // the token and hydrate state rather than resetting to unauthenticated.
  useEffect(() => {
    if (_tokenAccess === null) return;

    const payload = decodeJWT(_tokenAccess);
    if (!payload || isTokenExpired(payload)) {
      // Silently clear stale/expired refs — no throw, no network call
      _tokenAccess = null;
      _tokenRefresh = null;
      _userName = null;
      return;
    }

    setState({
      token: _tokenAccess,
      role: payload.role,
      name: _userName,
      userId: payload.sub,
      isAuthenticated: true,
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── login ─────────────────────────────────────────────────────────────────

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

    // Return the role so callers can navigate without calling useAuth() again
    // inside an async callback (which would violate the Rules of Hooks).
    return payload.role;
  }, []);

  // ── logout ────────────────────────────────────────────────────────────────

  const logout = useCallback((): void => {
    _tokenAccess = null;
    _tokenRefresh = null;
    _userName = null;
    setState(UNAUTHENTICATED);
    // Synchronous. Caller (LoginPage or router guard) handles navigate('/login').
  }, []);

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
    }),
    [state.token, state.role, state.name, state.userId, state.isAuthenticated, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ---------------------------------------------------------------------------
// Internal accessor — only useAuth.ts consumes this
// ---------------------------------------------------------------------------

export { AuthContext };
