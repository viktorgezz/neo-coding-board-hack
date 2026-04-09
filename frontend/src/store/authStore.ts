import { create } from 'zustand';
import type { AuthState } from '@/types/auth';

/**
 * MEMORY-ONLY auth store — intentionally has no persist middleware.
 *
 * Consequence (document this to teammates): tokenAccess does NOT survive a
 * hard page refresh. After a refresh the user will be redirected to /login
 * and must authenticate again. This is deliberate — storing tokens in
 * localStorage/sessionStorage violates the XSS security requirements for
 * this project.
 *
 * Token refresh logic lives exclusively in the axios interceptor layer
 * (src/lib/apiClient.ts). The router only reads token existence; it never
 * triggers a refresh.
 */
export const useAuthStore = create<AuthState>()((set) => ({
  tokenAccess: null,
  tokenRefresh: null,
  role: null,

  setAuth: (tokenAccess, tokenRefresh, role) =>
    set({ tokenAccess, tokenRefresh, role }),

  clearAuth: () =>
    set({ tokenAccess: null, tokenRefresh: null, role: null }),
}));
