/**
 * Route guard components — thin wrappers that read auth state and redirect.
 *
 * Rules:
 * - Each guard is a standalone component. Do NOT merge them into a single
 *   ProtectedRoute that branches on a roles array.
 * - Redirects use <Navigate replace> inside render, never useEffect.
 * - Guards are zero data-fetching, zero side-effects. They only read auth state.
 * - Do not memo these components — they render only on route transitions.
 *
 * Auth source: useAuth() (AuthContext) — the same store that login() writes to.
 * Do NOT use useAuthStore() (Zustand) here — that store is never updated by login().
 */

import { Navigate } from 'react-router-dom';
import { useAuth } from '@/auth/useAuth';
import { ROLES } from '@/constants/roles';
import type { ProtectedRouteProps } from '@/types/auth';

// ---------------------------------------------------------------------------
// InterviewerRoute
// ---------------------------------------------------------------------------

export function InterviewerRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated || role !== ROLES.INTERVIEWER) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// ---------------------------------------------------------------------------
// HRRoute
// ---------------------------------------------------------------------------

export function HRRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, role } = useAuth();

  // HR pages are also available for admin (cross-role analytics access).
  if (!isAuthenticated || (role !== ROLES.HR && role !== ROLES.ADMIN)) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// ---------------------------------------------------------------------------
// AdminRoute
// ---------------------------------------------------------------------------

export function AdminRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated || role !== ROLES.ADMIN) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
