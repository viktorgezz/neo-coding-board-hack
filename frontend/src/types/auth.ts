import type { AuthRole } from '@/constants/roles';
import type { ReactNode } from 'react';

export interface AuthState {
  tokenAccess: string | null;
  tokenRefresh: string | null;
  role: AuthRole | null;
  setAuth: (tokenAccess: string, tokenRefresh: string, role: AuthRole) => void;
  clearAuth: () => void;
}

export interface ProtectedRouteProps {
  children: ReactNode;
}

export interface RoleRedirectProps {
  role: AuthRole | null;
}
