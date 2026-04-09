/**
 * Pure JWT utilities — no external library, no side effects.
 * Exported for unit testing without needing to mount a provider.
 */

import type { AuthRole } from '@/constants/roles';
import { ROLES } from '@/constants/roles';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface JWTPayload {
  sub: string;
  role: AuthRole;  // 'interviewer' | 'hr' | 'admin' — candidate excluded by design
  exp: number;     // unix timestamp, seconds
  iat: number;
}

// ---------------------------------------------------------------------------
// Runtime role guard
// ---------------------------------------------------------------------------

/** The set of roles that may appear in a staff JWT. */
const VALID_AUTH_ROLES = new Set<string>([
  ROLES.INTERVIEWER,
  ROLES.HR,
  ROLES.ADMIN,
]);

function isValidAuthRole(value: unknown): value is AuthRole {
  return typeof value === 'string' && VALID_AUTH_ROLES.has(value);
}

// ---------------------------------------------------------------------------
// decodeJWT
// ---------------------------------------------------------------------------

/**
 * Decodes the payload segment of a JWT without verifying the signature.
 *
 * Returns null on any error (malformed token, invalid base64, bad JSON,
 * missing/wrong-typed fields, or a role that is not a valid AuthRole).
 * Never throws — callers treat null as "unauthenticated".
 *
 * Note: 'candidate' role returns null even if the JWT is otherwise valid.
 * Candidates have a separate auth flow and must never reach this code path.
 */
export function decodeJWT(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    // base64url → base64: replace URL-safe chars, pad if needed
    const base64url = parts[1];
    const base64 = base64url
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(base64url.length + ((4 - (base64url.length % 4)) % 4), '=');

    const json = atob(base64);
    const raw: unknown = JSON.parse(json);

    if (raw === null || typeof raw !== 'object') return null;

    const p = raw as Record<string, unknown>;

    // Extract to locals so TypeScript can narrow each type through the guard below
    const sub = p['sub'];
    const exp = p['exp'];
    const iat = p['iat'];

    // Backend sends uppercase roles: INTERVIEWER, HR, SUPERUSER
    // Normalize to lowercase and map SUPERUSER → admin
    const rawRole = p['role'];
    const normalizedRole = typeof rawRole === 'string'
      ? (rawRole.toLowerCase() === 'superuser' ? 'admin' : rawRole.toLowerCase())
      : rawRole;

    if (
      typeof sub !== 'string' ||
      typeof exp !== 'number' ||
      typeof iat !== 'number' ||
      !isValidAuthRole(normalizedRole)
    ) {
      return null;
    }

    const role = normalizedRole;
    return { sub, role, exp, iat };
  } catch {
    // Malformed base64, JSON parse error, or any other exception
    return null;
  }
}

// ---------------------------------------------------------------------------
// isTokenExpired
// ---------------------------------------------------------------------------

/**
 * Returns true when the token is expired or within 10 seconds of expiring.
 *
 * The 10-second buffer prevents race conditions where a token looks valid
 * here but expires before the network request it authorises completes.
 */
export function isTokenExpired(payload: JWTPayload): boolean {
  return Date.now() / 1000 > payload.exp - 10;
}
