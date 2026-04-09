/**
 * HRDashboardPage — /hr/candidates
 *
 * Paginated, filterable list of ALL interview sessions across all interviewers.
 * Protected by HRRoute — token is always non-null when this renders.
 *
 * State split:
 *   URL params (?page, ?status) — bookmarkable, browser-back-safe
 *   useState(searchTerm)        — client-side only, NOT in URL (avoids re-fetch on typing)
 *
 * Filtering:
 *   Status filter → server-side: ?status=ACTIVE|FINISHED (omitted when ALL)
 *   Name search   → client-side: filteredRooms = useMemo([rooms, searchTerm])
 *
 * IMPORTANT: totalElements reflects the server-side count (pre-name-filter).
 * filteredRooms.length is the post-filter count. These can differ when a search
 * term is active — the result count line distinguishes these two cases.
 */

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useAuth } from '@/auth/useAuth';
import CandidateRow from '@/components/CandidateRow';
import type { HRRoomSummary } from '@/components/CandidateRow';
import StatusTabs, { STATUS_TABS } from '@/components/StatusTabs';
import type { StatusFilter } from '@/components/StatusTabs';
import Pagination from '@/components/Pagination';
import styles from './HRDashboardPage.module.css';

// ---------------------------------------------------------------------------
// Constants — defined outside component, stable references
// ---------------------------------------------------------------------------

const VALID_STATUS_FILTERS: ReadonlyArray<StatusFilter> = ['ALL', 'CREATED', 'ACTIVE', 'FINISHED'];

/** Column definitions — used for header rendering. Widths match the CSS grid. */
const COLUMNS = [
  { key: 'candidate', label: 'Кандидат',     width: '1fr'   },
  { key: 'date',      label: 'Дата',          width: '160px' },
  { key: 'duration',  label: 'Длительность',  width: '100px' },
  { key: 'verdict',   label: 'Статус',        width: '140px' },
] as const;

const PAGE_SIZE = 15; // HR needs more data density than interviewer list (10)
const SKELETON_COUNT = PAGE_SIZE;
const SKELETON_INDICES = Array.from({ length: SKELETON_COUNT }, (_, i) => i);

// ---------------------------------------------------------------------------
// API response types
// ---------------------------------------------------------------------------

interface PageInfo {
  size:          number;
  number:        number;
  totalElements: number;
  totalPages:    number;
}

interface RoomListResponse {
  content:        HRRoomSummary[];
  totalPages?:    number;
  totalElements?: number;
  size?:          number;
  number?:        number;
  page?: PageInfo;
}

// ---------------------------------------------------------------------------
// Skeleton row — local sub-component, not exported
// ---------------------------------------------------------------------------

function SkeletonRow() {
  return (
    <div className={styles.skeletonRow} aria-hidden="true">
      {/* Candidate column: 140px wide cell */}
      <div>
        <div className={styles.skeletonCell} style={{ width: 140 }} />
      </div>
      {/* Date column: 90px wide cell */}
      <div>
        <div className={styles.skeletonCell} style={{ width: 90 }} />
      </div>
      {/* Duration column: 40px wide cell */}
      <div>
        <div className={styles.skeletonCell} style={{ width: 40 }} />
      </div>
      {/* Verdict column: 70px wide cell */}
      <div>
        <div className={styles.skeletonCell} style={{ width: 70 }} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// HRDashboardPage
// ---------------------------------------------------------------------------

export default function HRDashboardPage() {
  const { token }  = useAuth(); // always non-null inside HRRoute
  const navigate   = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const listRef    = useRef<HTMLDivElement | null>(null);

  // ── URL-derived state ──────────────────────────────────────────────────────
  const currentPage = Number(searchParams.get('page') ?? '0');

  // Validate status from URL — fallback to 'ALL' for any invalid value
  const rawStatus      = searchParams.get('status') ?? 'ALL';
  const statusFilter: StatusFilter = VALID_STATUS_FILTERS.includes(rawStatus as StatusFilter)
    ? rawStatus as StatusFilter
    : 'ALL';

  // ── Local state ────────────────────────────────────────────────────────────
  const [rooms,      setRooms]      = useState<HRRoomSummary[]>([]);
  const [pageInfo,   setPageInfo]   = useState<PageInfo | null>(null);
  const [isLoading,  setIsLoading]  = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  /**
   * searchTerm lives in useState, NOT in URL params — avoids triggering
   * a network re-fetch on every keystroke. Tab changes preserve the term.
   */
  const [searchTerm, setSearchTerm] = useState('');
  /**
   * Incrementing retryCount triggers the fetch useEffect (retryCount in deps).
   * Must be useState — useRef does NOT trigger effects.
   */
  const [retryCount, setRetryCount] = useState(0);

  // ── URL param helper ───────────────────────────────────────────────────────
  const updateParams = useCallback((updates: Record<string, string>) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      Object.entries(updates).forEach(([k, v]) => next.set(k, v));
      return next;
    });
  }, [setSearchParams]);

  // ── Data fetch ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const bearerToken = token ?? '';

    async function fetchRooms() {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: String(currentPage),
        size: String(PAGE_SIZE),
      });
      // Omit status param entirely when filter is ALL — do NOT send status=ALL
      if (statusFilter !== 'ALL') {
        params.set('status', statusFilter);
      }

      try {
        const res = await fetch(`/api/v1/rooms/all?${params.toString()}`, {
          headers: { Authorization: `Bearer ${bearerToken}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json() as RoomListResponse;
        setRooms(data.content);
        const pi: PageInfo = data.page ?? {
          totalPages:    data.totalPages    ?? 1,
          totalElements: data.totalElements ?? data.content.length,
          size:          data.size          ?? 15,
          number:        data.number        ?? 0,
        };
        setPageInfo(pi);
      } catch {
        setError('Не удалось загрузить список кандидатов.');
      } finally {
        setIsLoading(false);
      }
    }

    void fetchRooms();
  }, [currentPage, statusFilter, retryCount]); // eslint-disable-line react-hooks/exhaustive-deps
  // token is stable for the session lifetime — omitting it avoids a re-fetch on login

  // ── Client-side name filter ────────────────────────────────────────────────
  // filteredRooms is derived data — recomputes only on new fetch or search change.
  // totalElements from pageInfo is the server-side count (pre-filter); this value
  // and filteredRooms.length can diverge when a search term is active.
  const filteredRooms = useMemo(() => {
    if (!searchTerm.trim()) return rooms;
    const lower = searchTerm.toLowerCase().trim();
    return rooms.filter((room) =>
      (room.nameCandidate ?? 'Аноним').toLowerCase().includes(lower),
    );
  }, [rooms, searchTerm]);

  // ── Callbacks ──────────────────────────────────────────────────────────────
  const handleRowClick = useCallback((idRoom: string) => {
    // All rows navigate to the same report route regardless of status
    navigate(`/hr/candidates/${idRoom}/report`);
  }, [navigate]);

  const handleTabChange = useCallback((tab: StatusFilter) => {
    updateParams({
      status: tab,
      page:   '0', // reset to first page on filter change
    });
  }, [updateParams]);

  const handlePageChange = useCallback((page: number) => {
    updateParams({ page: String(page) });
    listRef.current?.scrollTo({ top: 0 });
  }, [updateParams]);

  const retry = useCallback(() => {
    setRetryCount((c) => c + 1);
  }, []);

  const handleResetSearch = useCallback(() => {
    setSearchTerm('');
  }, []);

  // ── Derived ────────────────────────────────────────────────────────────────
  const totalPages     = pageInfo?.totalPages ?? 1;
  const totalElements  = pageInfo?.totalElements ?? 0;
  const showPagination = !isLoading && !error && totalPages > 1;
  const isSearchActive = searchTerm.trim().length > 0;

  // Search filtered everything to zero — distinct from API empty
  const isSearchEmpty = !isLoading && !error && rooms.length > 0 && filteredRooms.length === 0;
  // API returned no content (status filter matched nothing)
  const isApiEmpty    = !isLoading && !error && rooms.length === 0;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className={styles.hrPage}>

      {/* ── Page header ── */}
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Все кандидаты</h1>
      </div>

      {/* ── Controls bar: status tabs (left) + search input (right) ── */}
      <div className={styles.controlsBar}>
        <StatusTabs
          active={statusFilter}
          onChange={handleTabChange}
        />

        <input
          type="text"
          className={styles.searchInput}
          placeholder="Поиск по имени..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label="Поиск кандидата по имени"
        />
      </div>

      {/* ── Table header ── */}
      <div className={styles.tableHeader}>
        {COLUMNS.map((col) => (
          <span key={col.key} className={styles.colHeader}>
            {col.label}
          </span>
        ))}
      </div>

      {/* ── Table body ── */}
      <div
        ref={listRef}
        className={styles.tableBody}
        role="list"
      >
        {isLoading ? (
          // 15 skeleton rows — same grid as real rows, no layout shift on arrival
          SKELETON_INDICES.map((i) => <SkeletonRow key={i} />)
        ) : error !== null ? (
          // Error state: message + retry
          <div className={styles.errorState}>
            <p>{error}</p>
            <button type="button" className={styles.retryBtn} onClick={retry}>
              Повторить
            </button>
          </div>
        ) : isSearchEmpty ? (
          // Search produced zero results — rooms has data but filteredRooms is empty
          <div className={styles.emptyState}>
            <p>Кандидат «{searchTerm}» не найден на этой странице.</p>
            <button
              type="button"
              className={styles.resetSearchBtn}
              onClick={handleResetSearch}
            >
              Сбросить поиск
            </button>
          </div>
        ) : isApiEmpty ? (
          // API returned empty content for the current status filter
          <div className={styles.emptyState}>
            <p>
              Нет сессий
              {statusFilter !== 'ALL'
                ? ` с фильтром «${STATUS_TABS.find((t) => t.value === statusFilter)?.label ?? ''}»`
                : ''}
              .
            </p>
          </div>
        ) : (
          // Data: one CandidateRow per filtered room
          filteredRooms.map((room) => (
            <CandidateRow
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

      {/* ── Result count — always shown when not loading ── */}
      {!isLoading && !error && (
        <p className={styles.resultCount}>
          {isSearchActive
            ? `Найдено ${filteredRooms.length} на этой странице`
            : `Показано ${filteredRooms.length} из ${totalElements}`}
        </p>
      )}

    </div>
  );
}
