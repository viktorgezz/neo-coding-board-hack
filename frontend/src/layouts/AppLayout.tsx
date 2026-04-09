/**
 * AppLayout — persistent chrome wrapping all authenticated screens.
 *
 * Renders a fixed dark sidebar (220px) + <Outlet /> for child routes.
 * Candidate screens (/session/:id/*) never mount this layout — they are
 * root-level routes in the router with no parent layout.
 *
 * Data sources: useAuth() and useLocation() only. Zero prop drilling.
 * Zero useEffect — all derived data comes from hooks, no subscriptions.
 */

import { memo, useMemo, useState, type ReactNode } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { List, Plus, Users, Shield } from 'lucide-react';

import { useAuth } from '@/auth/useAuth';
import type { AuthRole } from '@/constants/roles';
import styles from './AppLayout.module.css';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NavItem {
  label: string;
  path: string;
  icon: ReactNode;
  /** When true, only an exact pathname match marks this item as active. */
  exact?: boolean;
}

// ---------------------------------------------------------------------------
// Nav item registry
//
// Defined at module scope so icon JSX elements are created once — their
// object references are stable, which makes React.memo on NavItemComponent
// actually effective (no spurious re-renders from a changed icon prop).
// ---------------------------------------------------------------------------

const NAV_ITEMS: Record<AuthRole, NavItem[]> = {
  interviewer: [
    { label: 'My Sessions',      path: '/interviewer/sessions',     icon: <List size={16} /> },
    { label: 'Create Interview', path: '/interviewer/sessions/new', icon: <Plus size={16} />, exact: true },
  ],
  hr: [
    { label: 'All Candidates',   path: '/hr/candidates',            icon: <Users size={16} /> },
  ],
  admin: [
    { label: 'All Candidates',   path: '/hr/candidates',            icon: <Users size={16} /> },
    { label: 'Users',            path: '/admin/users',              icon: <Shield size={16} /> },
  ],
};

// ---------------------------------------------------------------------------
// isActive helper
//
// Default (exact=false): active when pathname equals itemPath or starts with
//   itemPath + '/' (sub-routes like /interviewer/sessions/123).
//
// exact=true: active only on an exact pathname match.
//
// The caller suppresses prefix matching for ALL items when any exact-flagged
// item in the list matches the current path — this prevents "My Sessions"
// from lighting up while "Create Interview" (/interviewer/sessions/new) is
// the active route.
// ---------------------------------------------------------------------------

function isActive(itemPath: string, currentPath: string, exact: boolean): boolean {
  if (exact) return currentPath === itemPath;
  return currentPath === itemPath || currentPath.startsWith(itemPath + '/');
}

// ---------------------------------------------------------------------------
// NavItemComponent (memoized)
//
// Props are primitives + stable icon ref — memo prevents re-renders caused
// by AppLayout re-rendering on location changes that don't affect this item.
// ---------------------------------------------------------------------------

interface NavItemProps {
  label: string;
  path: string;
  icon: ReactNode;
  active: boolean;
}

const NavItemComponent = memo(function NavItemComponent({
  label,
  path,
  icon,
  active,
}: NavItemProps) {
  const className = active
    ? `${styles.navItem} ${styles.navItemActive}`
    : styles.navItem;

  return (
    <Link to={path} className={className}>
      {icon}
      <span>{label}</span>
    </Link>
  );
});

// ---------------------------------------------------------------------------
// Role label map
// ---------------------------------------------------------------------------

const ROLE_LABEL: Record<AuthRole, string> = {
  interviewer: 'Interviewer',
  hr: 'HR',
  admin: 'Admin',
};

// ---------------------------------------------------------------------------
// Sidebar content
//
// Extracted to avoid duplicating the markup between the persistent sidebar
// (desktop) and the overlay sidebar (mobile). Both receive the same element.
// This is a render helper, not a component — it closes over the outer scope.
// ---------------------------------------------------------------------------

interface SidebarInnerProps {
  navItems: NavItem[];
  currentPath: string;
  hasExactMatch: boolean;
  name: string | null;
  role: AuthRole | null;
  onLogout: () => void;
}

function SidebarInner({
  navItems,
  currentPath,
  hasExactMatch,
  name,
  role,
  onLogout,
}: SidebarInnerProps) {
  return (
    <>
      <div className={styles.sidebarTop}>
        <span>NEO CODING BOARD</span>
      </div>

      <nav className={styles.sidebarNav}>
        {navItems.map((item) => {
          // When any exact-flagged item matches the current path, force all
          // non-exact items into exact mode too — prevents prefix collision.
          const forceExact = item.exact === true ? true : hasExactMatch;

          return (
            <NavItemComponent
              key={item.path}
              label={item.label}
              path={item.path}
              icon={item.icon}
              active={isActive(item.path, currentPath, forceExact)}
            />
          );
        })}
      </nav>

      <div className={styles.sidebarBottom}>
        <div className={styles.userInfo}>
          <span className={styles.userName}>{name ?? '—'}</span>
          {role !== null && (
            <span className={styles.userRole}>{ROLE_LABEL[role]}</span>
          )}
        </div>
        <button
          type="button"
          className={styles.logoutBtn}
          onClick={onLogout}
        >
          Logout
        </button>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// AppLayout
// ---------------------------------------------------------------------------

export default function AppLayout() {
  const { role, name, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Single boolean for mobile overlay — CSS media query handles sidebar
  // visibility; JS only manages whether the overlay is open or closed.
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Recomputed only when role changes — role determines which nav items exist
  const navItems = useMemo<NavItem[]>(() => {
    if (role === null) return [];
    return NAV_ITEMS[role];
  }, [role]);

  // True when an exact-flagged item in the current role's list exactly matches
  // the current pathname. Used to suppress prefix matching on sibling items.
  const hasExactMatch = navItems.some(
    (item) => item.exact === true && item.path === location.pathname,
  );

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const sidebarProps: SidebarInnerProps = {
    navItems,
    currentPath: location.pathname,
    hasExactMatch,
    name,
    role,
    onLogout: handleLogout,
  };

  return (
    <div className={styles.appShell}>
      {/* ── Desktop sidebar (sticky, always in DOM, hidden on mobile via CSS) */}
      <aside className={styles.sidebar}>
        <SidebarInner {...sidebarProps} />
      </aside>

      {/* ── Mobile top bar (hidden on desktop via CSS) */}
      <div className={styles.mobileTopBar}>
        <span className={styles.mobileTopBarWordmark}>NEO CODING BOARD</span>
        <button
          type="button"
          className={styles.mobileMenuBtn}
          onClick={() => setIsMobileOpen(true)}
          aria-label="Open navigation"
          aria-expanded={isMobileOpen}
        >
          {/* Unicode hamburger — avoids an extra lucide-react import */}
          ☰
        </button>
      </div>

      {/* ── Mobile overlay sidebar (JS-toggled; position:fixed, z-index:50) */}
      {isMobileOpen && (
        <>
          <div
            className={styles.mobileBackdrop}
            onClick={() => setIsMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className={`${styles.sidebar} ${styles.sidebarOverlay}`}>
            <SidebarInner {...sidebarProps} />
          </aside>
        </>
      )}

      {/* ── Main content — independent scroll, sidebar scroll is separate */}
      <main className={styles.mainContent}>
        <Outlet />
      </main>
    </div>
  );
}
