/**
 * SessionListPage — /interviewer/sessions
 *
 * Paginated list of all interview sessions for the authenticated interviewer.
 * Protected by InterviewerRoute — token is always non-null when this renders.
 *
 * Page state lives in the URL (?page=0) via useSearchParams, not in useState.
 * This means the browser back button restores the previous page correctly,
 * and deep-linking to ?page=3 works without any extra logic.
 *
 * Row navigation:
 *   CREATED / ACTIVE → /interviewer/sessions/:id       (live room)
 *   FINISHED         → /interviewer/sessions/:id/report (historical report)
 *
 * Retry strategy: retryCount is a useState (not useRef) so incrementing it
 * triggers the fetch useEffect as a dependency. useRef does NOT trigger effects.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { staffAuthedFetch } from '@/auth/staffAuthedFetch';
import SessionRow from '@/components/SessionRow';
import type { RoomSummary } from '@/components/SessionRow';
import Pagination from '@/components/Pagination';
import styles from './SessionListPage.module.css';

// ---------------------------------------------------------------------------
// API response shape
// ---------------------------------------------------------------------------

interface PageInfo {
  size:          number;
  number:        number;
  totalElements: number;
  totalPages:    number;
}

// Spring Boot returns Page fields at root level, older mock used nested "page"
interface RoomListResponse {
  content:       RoomSummary[];
  // flat (real Spring Page)
  totalPages?:   number;
  totalElements?: number;
  size?:         number;
  number?:       number;
  // nested (mock format)
  page?: PageInfo;
}

// ---------------------------------------------------------------------------
// Skeleton row — local sub-component, not exported
// ---------------------------------------------------------------------------

function SkeletonRow({ index }: { index: number }) {
  return (
    <div
      key={index}
      className={styles.skeletonRow}
      aria-hidden="true"
    />
  );
}

const SKELETON_COUNT = 5;
const SKELETONS = Array.from({ length: SKELETON_COUNT }, (_, i) => i);

// ---------------------------------------------------------------------------
// SessionListPage
// ---------------------------------------------------------------------------

export default function SessionListPage() {
  const navigate   = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const listRef    = useRef<HTMLDivElement | null>(null);

  // Page comes from URL — 0-indexed, default 0
  const currentPage = Number(searchParams.get('page') ?? '0');

  // ── State ──────────────────────────────────────────────────────────────

  const [rooms,      setRooms]      = useState<RoomSummary[]>([]);
  const [pageInfo,   setPageInfo]   = useState<PageInfo | null>(null);
  const [isLoading,  setIsLoading]  = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  /**
   * Incrementing this triggers the fetch useEffect to re-run (retry).
   * Must be useState, not useRef — only state changes trigger effects.
   */
  const [retryCount, setRetryCount] = useState(0);

  // ── Data fetch ───────────────────────────────────────────────────────────

  useEffect(() => {
    async function fetchRooms() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await staffAuthedFetch(
          `/api/v1/rooms?page=${currentPage}&size=10`,
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json() as RoomListResponse;
        setRooms(data.content);
        // Normalise flat Spring Page vs nested mock page
        const pi: PageInfo = data.page ?? {
          totalPages:    data.totalPages    ?? 1,
          totalElements: data.totalElements ?? data.content.length,
          size:          data.size          ?? 10,
          number:        data.number        ?? 0,
        };
        setPageInfo(pi);
      } catch {
        setError('Не удалось загрузить список сессий.');
      } finally {
        setIsLoading(false);
      }
    }

    void fetchRooms();
  }, [currentPage, retryCount]);

  // ── Callbacks ────────────────────────────────────────────────────────────

  const handleRowClick = useCallback((room: RoomSummary) => {
    if (room.status === 'ACTIVE' || room.status === 'CREATED') {
      navigate(`/interviewer/sessions/${room.idRoom}`);
    } else {
      navigate(`/interviewer/sessions/${room.idRoom}/report`);
    }
  }, [navigate]);

  const handlePageChange = useCallback((page: number) => {
    setSearchParams({ page: String(page) });
    // Scroll the list container to top — avoids user landing at the bottom
    // of a new page because their scroll position was preserved from the old one.
    listRef.current?.scrollTo({ top: 0 });
  }, [setSearchParams]);

  const retry = useCallback(() => {
    setRetryCount((c) => c + 1);
  }, []);

  // ── Derived ───────────────────────────────────────────────────────────────

  const totalPages = pageInfo?.totalPages ?? 1;
  const showPagination = !isLoading && !error && totalPages > 1;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={styles.sessionsPage}>

      {/* ── Header ── */}
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Мои сессии</h1>
        <button
          type="button"
          className={styles.createBtn}
          onClick={() => navigate('/interviewer/sessions/new')}
        >
          Создать интервью
        </button>
      </div>

      {/* ── List area ── */}
      <div
        ref={listRef}
        className={styles.sessionList}
        role="list"
      >
        {isLoading ? (
          // Loading: 5 skeleton rows — same height as real rows, no layout shift
          SKELETONS.map((i) => <SkeletonRow key={i} index={i} />)
        ) : error !== null ? (
          // Error: message + retry button
          <div className={styles.errorState}>
            <p>{error}</p>
            <button type="button" className={styles.retryBtn} onClick={retry}>
              Повторить
            </button>
          </div>
        ) : rooms.length === 0 ? (
          // Empty: plain centred message, no illustration
          <div className={styles.emptyState}>
            <p>Нет сессий. Создайте первое интервью.</p>
          </div>
        ) : (
          // Data: one SessionRow per room
          rooms.map((room) => (
            <SessionRow
              key={room.idRoom}
              room={room}
              onClick={handleRowClick}
            />
          ))
        )}
      </div>

      {/* ── Pagination — hidden during loading, error, and single-page results ── */}
      {showPagination && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}

    </div>
  );
}
