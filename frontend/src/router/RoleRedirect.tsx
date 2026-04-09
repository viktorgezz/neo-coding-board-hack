import { Navigate } from 'react-router-dom';
import { ROLES } from '@/constants/roles';
import type { AuthRole } from '@/constants/roles';

/**
 * Returns the canonical home path for a given authenticated role.
 *
 * Usage in LoginPage after successful POST /api/v1/auth/login:
 *   const { setAuth } = useAuthStore();
 *   setAuth(tokenAccess, tokenRefresh, role);
 *   navigate(getRoleHome(role));
 */
export function getRoleHome(role: AuthRole): string {
  switch (role) {
    case ROLES.INTERVIEWER:
      return '/interviewer/sessions';
    case ROLES.HR:
      return '/hr/candidates';
    case ROLES.ADMIN:
      return '/admin/users';
  }
}

/**
 * Mounted at "/" — redirects authenticated users to their role's home page.
 * Unauthenticated visitors (role === null) go to /login.
 *
 * Candidate role is not present in AuthRole, so candidates never land here —
 * they enter the app directly via /session/:id/join.
 */
export function RoleRedirect({ role }: { role: AuthRole | null }) {
  if (role === null) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getRoleHome(role)} replace />;
}
