/**
 * AdminUsersPage — /admin/users
 *
 * User management surface: view all staff accounts, create new ones, delete.
 * Protected by AdminRoute — token and userId are non-null when this renders.
 *
 * Optimistic mutations:
 *   Create → prepend new user to list (no re-fetch).
 *   Delete → filter deleted user from list (no re-fetch).
 *
 * currentPage: useState (not URL param) — admin user management is a
 * management tool, not a shareable/bookmarkable URL.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/auth/useAuth';
import UserRow from '@/components/UserRow';
import type { AdminUser } from '@/components/UserRow';
import CreateUserModal from '@/components/CreateUserModal';
import DeleteConfirmModal from '@/components/DeleteConfirmModal';
import EditUserModal from '@/components/EditUserModal';
import Pagination from '@/components/Pagination';
import BackLink from '@/components/BackLink';
import { mapStaffUserToAdminUser, type StaffUserJson } from '@/api/staffUsersApi';
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

/** Spring Data Page: либо вложенный `page`, либо плоские totalPages/number/size. */
interface AdminUsersListJson {
  content:        unknown[];
  page?:          { totalPages: number; size?: number; number?: number; totalElements?: number };
  totalPages?:    number;
  totalElements?: number;
  size?:          number;
  number?:        number;
}

interface PageInfo {
  totalPages: number;
}

interface CandidateRoomSummary {
  idRoom: string;
  nameCandidate: string | null;
  status: 'CREATED' | 'ACTIVE' | 'FINISHED';
  dateStart: string;
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
  const navigate = useNavigate();
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
  const [userToEdit,        setUserToEdit]        = useState<AdminUser | null>(null);
  const [candidateRooms,    setCandidateRooms]    = useState<CandidateRoomSummary[]>([]);

  // ── Data fetch ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const bearerToken = token ?? '';

    async function fetchUsers() {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/v1/users/staff?page=${currentPage}&size=${PAGE_SIZE}`,
          { headers: { Authorization: `Bearer ${bearerToken}` } },
        );

        if (res.status === 403) {
          setError('Недостаточно прав для просмотра списка пользователей.');
          return;
        }

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = (await res.json()) as AdminUsersListJson;
        const raw = Array.isArray(data.content) ? data.content : [];
        const list = (raw as StaffUserJson[]).map(mapStaffUserToAdminUser);
        setUsers(list);
        const totalPages =
          data.page?.totalPages ??
          data.totalPages ??
          (list.length > 0 ? 1 : 1);
        setPageInfo({ totalPages: Math.max(1, totalPages) });
      } catch {
        setError('Не удалось загрузить список пользователей.');
      } finally {
        setIsLoading(false);
      }
    }

    void fetchUsers();
  }, [currentPage, retryCount, token]);

  useEffect(() => {
    const bearerToken = token ?? '';
    async function fetchCandidates() {
      try {
        const res = await fetch('/api/v1/rooms/all?page=0&size=50', {
          headers: { Authorization: `Bearer ${bearerToken}` },
        });
        if (!res.ok) return;
        const data = (await res.json()) as { content: CandidateRoomSummary[] };
        setCandidateRooms(data.content);
      } catch {
        // non-blocking section
      }
    }
    void fetchCandidates();
  }, [token]);

  // ── Optimistic list updates ───────────────────────────────────────────────
  const handleUserCreated = useCallback(() => {
    setRetryCount((c) => c + 1);
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

  const handleEditClick = useCallback((user: AdminUser) => {
    setUserToEdit(user);
  }, []);

  const handleUserUpdated = useCallback((updatedUser: AdminUser) => {
    setUsers((prev) => prev.map((user) => (user.id === updatedUser.id ? updatedUser : user)));
  }, []);

  // ── Derived ───────────────────────────────────────────────────────────────
  const totalPages     = pageInfo?.totalPages ?? 1;
  const showPagination = !isLoading && !error && totalPages > 1;
  const resolvedToken  = token ?? '';

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={styles.adminPage}>
      <BackLink to="/">На главную</BackLink>

      {/* ── Page header ── */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Пользователи</h1>
        </div>

        <button
          type="button"
          className={styles.createBtn}
          onClick={() => setIsCreateModalOpen(true)}
        >
          Создать пользователя
        </button>
        <button
          type="button"
          className={styles.manageTaskBankBtn}
          onClick={() => navigate('/task-bank/manage')}
        >
          Управление задачами
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
              onEdit={handleEditClick}
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

      <EditUserModal
        isOpen={userToEdit !== null}
        user={userToEdit}
        token={resolvedToken}
        onClose={() => setUserToEdit(null)}
        onSuccess={handleUserUpdated}
      />

      <section className={styles.candidateSection}>
        <h2 className={styles.candidateTitle}>Все кандидаты и графики</h2>
        <div className={styles.candidateList}>
          {candidateRooms.map((room) => (
            <div key={room.idRoom} className={styles.candidateItem}>
              <div>
                <div>{room.nameCandidate ?? 'Анонимный кандидат'}</div>
                <div className={styles.candidateMeta}>
                  {room.idRoom} · {room.status} · {new Date(room.dateStart).toLocaleString()}
                </div>
              </div>
              <span className={styles.candidateMeta}>Графики доступны</span>
              <button
                type="button"
                className={styles.openReportBtn}
                onClick={() => navigate(`/admin/candidates/${room.idRoom}/report`)}
              >
                Открыть графики
              </button>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
