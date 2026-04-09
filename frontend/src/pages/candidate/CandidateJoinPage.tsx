/**
 * CandidateJoinPage — /session/:id/join
 *
 * Public entry point for candidates. Zero authentication required — no
 * cookies, no prior state, no useAuth(). The candidate's tokenAccess is
 * issued by POST /rooms/register/:id after they submit their name, then
 * stored in src/auth/candidateSession.ts (module-level variable).
 *
 * Two HTTP calls, sequenced deliberately:
 *   1. GET  /api/v1/rooms/join-info/:id   — on mount, to show vacancy name
 *   2. POST /api/v1/rooms/register/:id    — on submit, to register and receive token
 *
 * These are NOT chained on mount. Registration only fires when the candidate
 * submits the form.
 */

import { useState, useEffect, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { setCandidateSession } from '@/auth/candidateSession';
import styles from './CandidateJoinPage.module.css';

// ---------------------------------------------------------------------------
// Response shapes
// ---------------------------------------------------------------------------

interface JoinInfoResponse {
  nameVacancy: string;
  status?: string;
}

interface RegisterResponse {
  // camelCase (mock) or snake_case (real backend)
  tokenAccess?: string;
  tokenRefresh?: string;
  access_token?: string;
  refresh_token?: string;
}

// ---------------------------------------------------------------------------
// CandidateJoinPage
// ---------------------------------------------------------------------------

export default function CandidateJoinPage() {
  // useParams<{ id: string }> — matches the router definition path: '/session/:id/join'
  const { id: idRoom } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // ── State ──────────────────────────────────────────────────────────────

  const [vacancyName,      setVacancyName]      = useState<string | null>(null);
  const [nameCandidate,    setNameCandidate]    = useState('');
  // Initialize true so the skeleton renders immediately on first paint —
  // no flash of empty content before the fetch starts.
  const [isLoadingVacancy, setIsLoadingVacancy] = useState(true);
  const [isSubmitting,     setIsSubmitting]     = useState(false);
  const [vacancyError,     setVacancyError]     = useState<string | null>(null);
  const [submitError,      setSubmitError]      = useState<string | null>(null);

  // ── Mount: fetch vacancy info ──────────────────────────────────────────

  useEffect(() => {
    // Guard — should never fire with a correctly configured router,
    // but avoids a network call to '/api/v1/rooms/join-info/undefined'
    if (!idRoom) {
      setVacancyError('Неверная ссылка на комнату собеседования.');
      setIsLoadingVacancy(false);
      return;
    }

    async function loadVacancy() {
      setIsLoadingVacancy(true);
      try {
        const res = await fetch(`/api/v1/rooms/join-info/${idRoom}`);

        if (res.status === 404) {
          setVacancyError('Комната для собеседования не найдена.');
          return;
        }
        if (!res.ok) {
          setVacancyError('Не удалось загрузить данные собеседования. Попробуйте позже.');
          return;
        }

        const data = await res.json() as JoinInfoResponse;

        if (data.status === 'FINISHED') {
          setVacancyError('Это собеседование уже завершено.');
          return;
        }

        setVacancyName(data.nameVacancy);
      } catch {
        setVacancyError('Ошибка сети. Проверьте подключение.');
      } finally {
        setIsLoadingVacancy(false);
      }
    }

    void loadVacancy();
  }, [idRoom]); // idRoom is stable — re-fetch only if the URL param somehow changes

  // ── Submit: register candidate ─────────────────────────────────────────

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    // TypeScript narrowing: idRoom is always defined here because
    // the form is only rendered when vacancyError is null, which requires
    // a successful mount fetch, which requires idRoom to be defined.
    if (!idRoom) return;

    const trimmed = nameCandidate.trim();
    if (!trimmed) return; // silent guard — button is disabled when empty anyway

    // Clear previous submit error before each attempt — user sees immediate
    // feedback that the previous error is gone before the new request fires.
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/v1/rooms/register/${idRoom}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Real API expects full_name; mock expected nameCandidate
        body: JSON.stringify({ full_name: trimmed, nameCandidate: trimmed }),
      });

      if (!res.ok) {
        setSubmitError('Не удалось зарегистрироваться. Комната может быть уже неактивна.');
        return;
      }

      const raw = await res.json() as RegisterResponse;
      // Normalize: real API → access_token, mock → tokenAccess
      const tokenAccess = raw.tokenAccess ?? raw.access_token ?? '';

      // Store token, room ID, and vacancy name in the module-level session.
      // Passing vacancyName ensures the editor shows the same vacancy the
      // join page fetched — no extra round-trip needed.
      setCandidateSession(tokenAccess, idRoom, vacancyName ?? '');

      // replace: false — browser back button from the editor = leave session,
      // not loop back to this join page with a stale state
      navigate(`/session/${idRoom}/candidate`);
    } catch {
      setSubmitError('Ошибка сети. Проверьте подключение и попробуйте ещё раз.');
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Derived state ──────────────────────────────────────────────────────

  const isSubmitEnabled =
    nameCandidate.trim().length > 0 &&
    !isLoadingVacancy &&
    vacancyError === null &&
    !isSubmitting;

  // Button class: one of three states — active, loading (in-flight), disabled
  const submitBtnClass = [
    styles.submitBtn,
    isSubmitting          ? styles.submitBtnLoading  : null,
    // Only apply disabled style when NOT submitting (loading has pointer-events:none already)
    !isSubmitting && !isSubmitEnabled ? styles.submitBtnDisabled : null,
  ]
    .filter(Boolean)
    .join(' ');

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <main className={styles.joinRoot}>
      <div className={styles.joinCard}>

        {vacancyError !== null ? (
          // ── Dead-end state ───────────────────────────────────────────────
          // Shown when the room doesn't exist, is already finished, or the
          // network failed on mount. No retry — candidate must close the tab.
          // We never show the room UUID anywhere.
          <div className={styles.deadEnd}>
            <span className={styles.deadEndIcon} aria-hidden="true">✕</span>
            <p className={styles.deadEndMessage}>{vacancyError}</p>
          </div>

        ) : (
          // ── Normal state ─────────────────────────────────────────────────
          <>
            {/* Vacancy label — skeleton during fetch, name after */}
            <div aria-live="polite">
              {isLoadingVacancy ? (
                // Static skeleton — no animation (spec requirement)
                <div className={styles.vacancySkeleton} aria-label="Загрузка данных собеседования…" />
              ) : (
                <>
                  <span className={styles.vacancyPrefix}>Собеседование на вакансию</span>
                  <span className={styles.vacancyName}>{vacancyName}</span>
                </>
              )}
            </div>

            <h1 className={styles.joinTitle}>Введите ваше имя</h1>

            <form
              className={styles.joinForm}
              onSubmit={(e) => { void handleSubmit(e); }}
            >
              <div className={styles.fieldGroup}>
                <label htmlFor="candidate-name" className={styles.label}>
                  ФИО
                </label>
                <input
                  id="candidate-name"
                  type="text"
                  autoComplete="name"
                  placeholder="Ваше ФИО"
                  className={styles.input}
                  value={nameCandidate}
                  onChange={(e) => setNameCandidate(e.target.value)}
                />
              </div>

              {/* Submit error — conditional, not reserved space */}
              {submitError !== null && (
                <p className={styles.submitError} role="alert" aria-live="polite">
                  {submitError}
                </p>
              )}

              <button type="submit" className={submitBtnClass}>
                {isSubmitting ? (
                  <span className={styles.spinner} aria-label="Вход…" />
                ) : (
                  'Войти на собеседование'
                )}
              </button>
            </form>
          </>
        )}

      </div>
    </main>
  );
}
