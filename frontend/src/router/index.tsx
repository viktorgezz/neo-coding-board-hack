/**
 * src/router/index.tsx
 *
 * Application router — the single source of truth for all routes.
 * Exports only the router instance (no components, no hooks).
 *
 * Technology choices:
 *   - createBrowserRouter + RouterProvider (React Router v6.4+)
 *   - React.lazy + Suspense per-route (no global Suspense boundary)
 *   - Auth checks live in guard components, not loader functions
 *   - AppLayout wraps all authenticated routes as a nested layout route
 *
 * ⚠️  Token persistence note:
 *   tokenAccess lives in module-level variables in AuthContext.tsx with NO
 *   persistence layer. It survives React re-renders (same JS heap) but NOT
 *   hard page refreshes (F5 / address-bar Enter). After a refresh the store
 *   resets to null and the user is sent to /login. This is intentional —
 *   see AuthContext.tsx.
 */

import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter } from 'react-router-dom';

import AppLayout from '@/layouts/AppLayout';
import { InterviewerRoute, HRRoute, AdminRoute } from './guards';
import { RoleRedirect } from './RoleRedirect';
import { useAuth } from '@/auth/useAuth';

// ---------------------------------------------------------------------------
// Lazy page imports — each route gets its own Suspense so code-splitting is
// maximally granular and a slow chunk never blocks an unrelated route.
// ---------------------------------------------------------------------------

const LoginPage = lazy(() => import('@/pages/LoginPage'));

const CandidateJoinPage    = lazy(() => import('@/pages/candidate/CandidateJoinPage'));
const CandidateEditorPage  = lazy(() => import('@/pages/candidate/CandidateEditorPage'));
const CandidateDonePage    = lazy(() => import('@/pages/candidate/CandidateDonePage'));

const SessionListPage      = lazy(() => import('@/pages/interviewer/SessionListPage'));
const CreateInterviewPage  = lazy(() => import('@/pages/interviewer/CreateInterviewPage'));
const InterviewerRoomPage  = lazy(() => import('@/pages/interviewer/InterviewerRoomPage'));

const ReportPage           = lazy(() => import('@/pages/shared/ReportPage'));
const TaskBankManagePage   = lazy(() => import('@/pages/shared/TaskBankManagePage'));

const HRDashboardPage      = lazy(() => import('@/pages/hr/HRDashboardPage'));

const AdminUsersPage       = lazy(() => import('@/pages/admin/AdminUsersPage'));

const NotFoundPage         = lazy(() => import('@/pages/NotFoundPage'));

// ---------------------------------------------------------------------------
// Minimal Suspense fallback — no spinner, no skeleton, no layout chrome.
// ---------------------------------------------------------------------------
const Fallback = () => null;

function wrap(node: ReactNode) {
  return <Suspense fallback={<Fallback />}>{node}</Suspense>;
}

// ---------------------------------------------------------------------------
// Route tree
// ---------------------------------------------------------------------------

export const router = createBrowserRouter([
  // ── Public routes (no layout) ──────────────────────────────────────────

  {
    path: '/login',
    element: wrap(<LoginPage />),
  },

  // Candidate flow — zero auth, no layout, no token check whatsoever
  {
    path: '/session/:id/join',
    element: wrap(<CandidateJoinPage />),
  },
  {
    path: '/session/:id/candidate',
    element: wrap(<CandidateEditorPage />),
  },
  {
    path: '/session/:id/done',
    element: wrap(<CandidateDonePage />),
  },

  // ── Authenticated routes — all wrapped in AppLayout via nested children ─

  {
    element: <AppLayout />,
    children: [
      // Interviewer (require INTERVIEWER token + role)
      {
        path: '/interviewer/sessions',
        element: (
          <InterviewerRoute>
            {wrap(<SessionListPage />)}
          </InterviewerRoute>
        ),
      },
      {
        path: '/interviewer/sessions/new',
        element: (
          <InterviewerRoute>
            {wrap(<CreateInterviewPage />)}
          </InterviewerRoute>
        ),
      },
      {
        path: '/interviewer/sessions/:id',
        element: (
          <InterviewerRoute>
            {wrap(<InterviewerRoomPage />)}
          </InterviewerRoute>
        ),
      },
      {
        path: '/interviewer/sessions/:id/report',
        element: (
          <InterviewerRoute>
            {wrap(<ReportPage />)}
          </InterviewerRoute>
        ),
      },

      // HR (require HR token + role)
      {
        path: '/hr/candidates',
        element: (
          <HRRoute>
            {wrap(<HRDashboardPage />)}
          </HRRoute>
        ),
      },
      {
        path: '/hr/candidates/:id/report',
        element: (
          <HRRoute>
            {wrap(<ReportPage />)}
          </HRRoute>
        ),
      },
      {
        path: '/task-bank/manage',
        element: (
          <HRRoute>
            {wrap(<TaskBankManagePage />)}
          </HRRoute>
        ),
      },

      // Admin (require ADMIN token + role)
      {
        path: '/admin/users',
        element: (
          <AdminRoute>
            {wrap(<AdminUsersPage />)}
          </AdminRoute>
        ),
      },
      {
        path: '/admin/candidates/:id/report',
        element: (
          <AdminRoute>
            {wrap(<ReportPage />)}
          </AdminRoute>
        ),
      },
    ],
  },

  // ── Root — redirect based on authenticated role ────────────────────────

  {
    path: '/',
    element: <RoleRedirectWrapper />,
  },

  // ── 404 catch-all ─────────────────────────────────────────────────────

  {
    path: '*',
    element: wrap(<NotFoundPage />),
  },
]);

/**
 * Thin wrapper so RoleRedirect can read auth state via a hook.
 * Hooks cannot be called outside a component; this provides the React
 * boundary the hook requires without adding a full layout.
 */
function RoleRedirectWrapper() {
  const { role } = useAuth();
  return <RoleRedirect role={role} />;
}
