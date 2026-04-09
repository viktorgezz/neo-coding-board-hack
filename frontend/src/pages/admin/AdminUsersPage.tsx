/**
 * AdminUsersPage — /admin/users
 *
 * User management surface: view all staff accounts, create new ones, delete.
 * Protected by AdminRoute — token and userId are non-null when this renders.
 *
 * ⚠ All API endpoints on this page are UNCONFIRMED with the backend team.
 *   Every fetch call is preceded by a TODO comment. Search "TODO" in this
 *   file to find all provisional API assumptions before production.
 *
 * Optimistic mutations:
 *   Create → prepend new user to list (no re-fetch).
 *   Delete → filter deleted user from list (no re-fetch).
 *   If consistency is required, TODO: add re-fetch after mutations.
 *
 * currentPage: useState (not URL param) — admin user management is a
 * management tool, not a shareable/bookmarkable URL.
 */

import { useState, useEffect, useCallback } from 'react';

import { useAuth } from '@/auth/useAuth';
import UserRow from '@/components/UserRow';
import type { AdminUser } from '@/components/UserRow';
import CreateUserModal from '@/components/CreateUserModal';
import DeleteConfirmModal from '@/components/DeleteConfirmModal';
import Pagination from '@/components/Pagination';
import styles from './AdminUsersPage.module.css';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE    = 20;
const SKELETON_N   = 5; // admin list is short — 5 skeletons sufficient
const SKELETON_IDX = Array.from({ length: SKELETON_N }, (_, i) => i);

const COLUMNS = [
  { key: 'user',    label: 'Пользователь' },
  { key: 'role',    label: 'Роль'         },
  { key: 'created', label: 'Добавлен'     },
] as const;

// ---------------------------------------------------------------------------
// API response types
// ---------------------------------------------------------------------------

// TODO: Confirm pagination wrapper shape with backend
interface AdminUsersResponse {
  content: AdminUser[];
  page: {
    size:          number;
    number:        number;
    totalElements: number;
    totalPages:    number;
  };
}

interface PageInfo {
  totalPages: number;
}

// ---------------------------------------------------------------------------
// Skeleton row — local sub-component
// ---------------------------------------------------------------------------

function SkeletonRow() {
  return (
    <div className={styles.skeletonRow} aria-hidden="true">
      {/* User identity column */}
      <div>
        <div className={styles.skeletonCell} style={{ width: 160 }} />
      </div>
      {/* Role column */}
      <div>
        <div className={styles.skeletonCell} style={{ width: 80 }} />
      </div>
      {/* Date column */}
      <div>
        <div className={styles.skeletonCell} style={{ width: 90 }} />
      </div>
      {/* Actions column — empty */}
      <div />
    </div>
  );
}

// ---------------------------------------------------------------------------
// AdminUsersPage
// ---------------------------------------------------------------------------

export default function AdminUsersPage() {
  const { token, userId: currentUserId } = useAuth();
  // currentPage: useState — admin page is not shareable, no URL param needed
  const [currentPage, setCurrentPage] = useState(0);

  // ── Data state ────────────────────────────────────────────────────────────
  const [users,      setUsers]      = useState<AdminUser[]>([]);
  const [pageInfo,   setPageInfo]   = useState<PageInfo | null>(null);
  const [isLoading,  setIsLoading]  = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  /**
   * Incrementing this triggers the fetch useEffect — must be useState, not
   * useRef. Only state changes trigger effects.
   */
  const [retryCount, setRetryCount] = useState(0);

  // ── Modal state ───────────────────────────────────────────────────────────
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [userToDelete,      setUserToDelete]      = useState<AdminUser | null>(null);

  // ── Data fetch ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const bearerToken = token ?? '';

    async function fetchUsers() {
      setIsLoading(true);
      setError(null);

      try {
        // TODO: Endpoint not confirmed with backend. Clarify before production.
        // TODO: Confirm endpoint URL — /api/v1/admin/users?
        // TODO: Confirm whether GET /admin/users returns paginated or flat array
        const res = await fetch(
          `/api/v1/admin/users?page=${currentPage}&size=${PAGE_SIZE}`,
          { headers: { Authorization: `Bearer ${bearerToken}` } },
        );

        if (res.status === 404) {
          // TODO: endpoint not yet implemented — surface a placeholder state
          setError('Управление пользователями временно недоступно. (API не реализован)');
          return;
        }

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json() as AdminUsersResponse;
        setUsers(data.content);
        setPageInfo({ totalPages: data.page.totalPages });
      } catch {
        setError('Не удалось загрузить список пользователей.');
      } finally {
        setIsLoading(false);
      }
    }

    void fetchUsers();
  }, [currentPage, retryCount]); // eslint-disable-line react-hooks/exhaustive-deps
  // token is stable for session lifetime — omitting avoids re-fetch on login

  // ── Optimistic list updates ───────────────────────────────────────────────
  const handleUserCreated = useCallback((newUser: AdminUser) => {
    setUsers((prev) => [newUser, ...prev]);
    // TODO: If server-side consistency is required, re-fetch here instead of
    // prepending optimistically. For now optimistic update is sufficient.
  }, []);

  const handleUserDeleted = useCallback((deletedId: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== deletedId));
    // TODO: If server-side consistency is required, re-fetch here instead of
    // filtering optimistically.
  }, []);

  // ── Other callbacks ───────────────────────────────────────────────────────
  const retry = useCallback(() => {
    setRetryCount((c) => c + 1);
  }, []);

  const handleDeleteClick = useCallback((user: AdminUser) => {
    setUserToDelete(user);
  }, []);

  // ── Derived ───────────────────────────────────────────────────────────────
  const totalPages     = pageInfo?.totalPages ?? 1;
  const showPagination = !isLoading && !error && totalPages > 1;
  const resolvedToken  = token ?? '';

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={styles.adminPage}>

      {/* ── Page header ── */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Пользователи</h1>
          {/* Visible reminder that all API calls in this file are provisional */}
          <p className={styles.pageSubtitle}>
            TODO: эндпоинт /api/v1/admin/users не подтверждён
          </p>
        </div>

        <button
          type="button"
          className={styles.createBtn}
          onClick={() => setIsCreateModalOpen(true)}
        >
          Создать пользователя
        </button>
      </div>

      {/* ── Table header ── */}
      <div className={styles.tableHeader}>
        {COLUMNS.map((col) => (
          <span key={col.key} className={styles.colHeader}>
            {col.label}
          </span>
        ))}
        {/* Empty span — delete column has no header */}
        <span />
      </div>

      {/* ── Table body ── */}
      <div className={styles.tableBody} role="list">
        {isLoading ? (
          SKELETON_IDX.map((i) => <SkeletonRow key={i} />)
        ) : error !== null ? (
          <div className={styles.errorState}>
            <p>{error}</p>
            <button type="button" className={styles.retryBtn} onClick={retry}>
              Повторить
            </button>
          </div>
        ) : users.length === 0 ? (
          <div className={styles.emptyState}>
            <p>Нет пользователей. Создайте первого.</p>
          </div>
        ) : (
          users.map((user) => (
            <UserRow
              key={user.id}
              user={user}
              currentUserId={currentUserId}
              onDelete={handleDeleteClick}
            />
          ))
        )}
      </div>

      {/* ── Pagination — only when totalPages > 1 ── */}
      {showPagination && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}

      {/* ── Modals ── */}
      <CreateUserModal
        isOpen={isCreateModalOpen}
        token={resolvedToken}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleUserCreated}
      />

      <DeleteConfirmModal
        isOpen={userToDelete !== null}
        user={userToDelete}
        token={resolvedToken}
        onClose={() => setUserToDelete(null)}
        onSuccess={handleUserDeleted}
      />

    </div>
  );
}
