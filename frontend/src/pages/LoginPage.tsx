/**
 * LoginPage — /login
 *
 * Entry point for all internal users (interviewer, hr, admin).
 * Candidates never land here — their flow starts at /session/:id/join.
 *
 * Rules enforced here:
 *   - Already-authenticated users are redirected synchronously (render-time
 *     <Navigate>, NOT useEffect) — zero flicker.
 *   - login() from useAuth() returns the AuthRole so we can navigate without
 *     calling a hook inside an async callback.
 *   - No AppLayout, no Sidebar — this page is its own full-screen root.
 *   - Zero useEffect, zero useMemo, zero useCallback.
 */

import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import { useAuth } from '@/auth/useAuth';
import type { AuthRole } from '@/constants/roles';
import styles from './LoginPage.module.css';

// ---------------------------------------------------------------------------
// Role → home path mapping
// Defined here so LoginPage owns its own navigation logic with no dependency
// on getRoleHome() from the router layer.
// ---------------------------------------------------------------------------

const ROLE_HOME: Record<AuthRole, string> = {
  interviewer: '/interviewer/sessions',
  hr:          '/hr/candidates',
  admin:       '/admin/users',
};

// ---------------------------------------------------------------------------
// LoginPage
// ---------------------------------------------------------------------------

export default function LoginPage() {
  const { isAuthenticated, role, login } = useAuth();
  const navigate = useNavigate();

  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  // ── Already-authenticated redirect ──────────────────────────────────────
  //
  // Synchronous render-time branch — no useEffect, no flicker.
  // Runs before any JSX is painted.
  if (isAuthenticated && role !== null) {
    return <Navigate to={ROLE_HOME[role]} replace />;
  }

  // ── Form submit ──────────────────────────────────────────────────────────

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // Clear previous error before each attempt — error state resets before
    // the request fires, not after (so the user sees immediate feedback).
    setError(null);
    setIsLoading(true);

    try {
      // login() POSTs to /api/v1/auth/login, decodes the JWT, updates context
      // state, and returns the decoded role — we never call useAuth() again
      // inside this async callback (Rules of Hooks).
      const loggedInRole = await login(email, password);
      navigate(ROLE_HOME[loggedInRole], { replace: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <main className={styles.loginRoot}>
      <div className={styles.loginCard}>
        <h1 className={styles.loginTitle}>Sign In</h1>

        <form className={styles.loginForm} onSubmit={(e) => { void handleSubmit(e); }}>

          {/* Email */}
          <div className={styles.fieldGroup}>
            <label htmlFor="login-email" className={styles.label}>
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* Password */}
          <div className={styles.fieldGroup}>
            <label htmlFor="login-password" className={styles.label}>
              Password
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {/*
            Error message — always rendered so its reserved min-height
            prevents layout shift when the error appears or disappears.
          */}
          <div className={styles.errorMessage} role="alert" aria-live="polite">
            {error}
          </div>

          {/* Submit */}
          <button
            type="submit"
            className={
              isLoading
                ? `${styles.submitBtn} ${styles.submitBtnLoading}`
                : styles.submitBtn
            }
          >
            {isLoading ? (
              <span className={styles.spinner} aria-label="Signing in…" />
            ) : (
              'Sign In'
            )}
          </button>

        </form>
      </div>
    </main>
  );
}
