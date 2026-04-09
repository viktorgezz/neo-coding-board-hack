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

import { memo, useMemo, useState, useEffect, type ReactNode } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { List, Plus, Users, Shield, BookOpen } from 'lucide-react';

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
    { label: 'Кандидаты',    path: '/hr/candidates',    icon: <Users    size={16} /> },
    { label: 'Банк задач',   path: '/task-bank/manage', icon: <BookOpen size={16} /> },
  ],
  admin: [
    { label: 'Кандидаты',    path: '/hr/candidates',    icon: <Users    size={16} /> },
    { label: 'Банк задач',   path: '/task-bank/manage', icon: <BookOpen size={16} /> },
    { label: 'Пользователи', path: '/admin/users',      icon: <Shield   size={16} /> },
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

  // #region agent log
  useEffect(() => {
    const els = [
      { name: 'html',         el: document.documentElement },
      { name: 'body',         el: document.body },
      { name: '#root',        el: document.getElementById('root') },
      { name: '.appShell',    el: document.querySelector('[class*="appShell"]') as HTMLElement | null },
      { name: '.mainContent', el: document.querySelector('[class*="mainContent"]') as HTMLElement | null },
    ];
    const data: Record<string, unknown> = {};
    for (const { name, el } of els) {
      if (!el) { data[name] = 'NOT FOUND'; continue; }
      const cs = getComputedStyle(el);
      data[name] = {
        overflow:     cs.overflow,
        overflowX:    cs.overflowX,
        overflowY:    cs.overflowY,
        height:       cs.height,
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
      };
    }
    // Fallback: always log to console so DevTools shows it even if fetch fails
    console.error('[DEBUG 53e720][post-fix] html.overflowY should be "hidden", was "auto" before fix. Now:', data);
    fetch('http://127.0.0.1:7245/ingest/d4c59247-8f5c-4330-ad2e-6797ad994d81',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'53e720'},body:JSON.stringify({sessionId:'53e720',runId:'post-fix',location:'AppLayout.tsx:mount',message:'post-fix verification',data,timestamp:Date.now(),hypothesisId:'E'})}).catch(()=>{});
  }, []);
  // #endregion

  return (
    <div className={styles.appShell}>
      {/* ── Desktop sidebar (sticky, always in DOM, hidden on mobile via CSS) */}
      <aside className={styles.sidebar}>
        <SidebarInner {...sidebarProps} />
      </aside>

      {/* ── Mobile top bar (hidden on desktop via CSS) */}
      <div className={styles.mobileTopBar}>
        <button
          type="button"
          className={styles.mobileMenuBtn}
          onClick={() => { console.error('[DEBUG 53e720][mobile-menu] hamburger clicked, setting isMobileOpen=true'); setIsMobileOpen(true); }}
          aria-label="Open navigation"
          aria-expanded={isMobileOpen}
        >
          ☰
        </button>
        <span className={styles.mobileTopBarWordmark}>NEO CODING BOARD</span>
      </div>

      {/* ── Mobile overlay sidebar (JS-toggled; position:fixed, z-index:50) */}
      {isMobileOpen && (
        <>
          {/* #region agent log */}
          {(() => {
            setTimeout(() => {
              const overlay = document.querySelector('[class*="sidebarOverlay"]') as HTMLElement | null;
              const backdrop = document.querySelector('[class*="mobileBackdrop"]') as HTMLElement | null;
              const data = {
                overlay: overlay ? { display: getComputedStyle(overlay).display, zIndex: getComputedStyle(overlay).zIndex, width: getComputedStyle(overlay).width, visibility: getComputedStyle(overlay).visibility } : 'NOT FOUND',
                backdrop: backdrop ? { display: getComputedStyle(backdrop).display, zIndex: getComputedStyle(backdrop).zIndex } : 'NOT FOUND',
                isMobileOpen: true,
              };
              console.error('[DEBUG 53e720][mobile-menu][post-fix] overlay.display should be "flex" now:', JSON.stringify(data, null, 2));
              fetch('http://127.0.0.1:7245/ingest/d4c59247-8f5c-4330-ad2e-6797ad994d81',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'53e720'},body:JSON.stringify({sessionId:'53e720',runId:'mobile-menu',location:'AppLayout.tsx:isMobileOpen',message:'overlay rendered',data,timestamp:Date.now(),hypothesisId:'F-G-H'})}).catch(()=>{});
            }, 50);
            return null;
          })()}
          {/* #endregion */}
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
