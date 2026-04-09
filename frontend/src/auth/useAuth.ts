/**
 * useAuth — the public surface for auth state throughout the app.
 *
 * Import this hook (and AuthProvider) from here. Do NOT import AuthContext
 * directly — it is an implementation detail of this module.
 *
 * Candidate pages do NOT use this hook. They read from
 * src/lib/candidateSession.ts instead.
 */

import { useContext } from 'react';
import { AuthContext, AuthProvider } from './AuthContext';
import type { AuthContextValue } from './AuthContext';

// Re-export the value type so route guards and pages can type their props
// without importing from AuthContext directly.
export type { AuthContextValue };

// Re-export AuthProvider so consumers only need one import path.
export { AuthProvider };

/**
 * Returns the current auth context value.
 *
 * Throws a descriptive error when called outside an AuthProvider tree —
 * this surfaces misconfiguration at development time rather than silently
 * returning null and causing confusing downstream failures.
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error(
      'useAuth must be used within an <AuthProvider>. ' +
        'Wrap your application (or the relevant subtree) with <AuthProvider>.',
    );
  }

  return context;
}
