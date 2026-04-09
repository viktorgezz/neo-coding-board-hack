/**
 * CreateInterviewPage — /interviewer/sessions/new
 *
 * Two-phase in-place flow:
 *
 *   form    — two text inputs + submit. Clean, sparse.
 *   success — inputs disabled, submit hidden, URL block + "Начать интервью" appear.
 *
 * Phase transition is one-way (form → success). There is no "back to form"
 * path — the interviewer navigates away via the sidebar if they need a new room.
 *
 * Token from useAuth() — this page is inside InterviewerRoute, so token is
 * always non-null when the component renders.
 */

import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/useAuth';
import styles from './CreateInterviewPage.module.css';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PagePhase = 'form' | 'success';

interface SuccessState {
  idRoom: string;
  url:    string;
}

interface CreateRoomResponse {
  idRoom: string;
  url:    string;
}

// ---------------------------------------------------------------------------
// CreateInterviewPage
// ---------------------------------------------------------------------------

export default function CreateInterviewPage() {
  const { token } = useAuth(); // stable for session lifetime, always non-null here
  const navigate  = useNavigate();

  // ── Form state ────────────────────────────────────────────────────────────

  const [titleRoom,   setTitleRoom]   = useState('');
  const [nameVacancy, setNameVacancy] = useState('');
  const [isLoading,   setIsLoading]   = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  // ── Phase state ───────────────────────────────────────────────────────────

  const [phase,        setPhase]        = useState<PagePhase>('form');
  const [successState, setSuccessState] = useState<SuccessState | null>(null);

  // ── Copy button ───────────────────────────────────────────────────────────

  const [copyLabel, setCopyLabel] =
    useState<'Копировать' | 'Скопировано!'>('Копировать');
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear any pending copy reset timer on unmount
  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  // ── Derived ───────────────────────────────────────────────────────────────

  const canSubmit =
    titleRoom.trim().length > 0 &&
    nameVacancy.trim().length > 0 &&
    !isLoading &&
    phase === 'form';

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const trimmedTitle   = titleRoom.trim();
    const trimmedVacancy = nameVacancy.trim();

    if (!trimmedTitle || !trimmedVacancy) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/rooms', {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${token ?? ''}`,
        },
        body: JSON.stringify({
          titleRoom:   trimmedTitle,
          nameVacancy: trimmedVacancy,
        }),
      });

      if (!res.ok) {
        const message =
          res.status === 409
            ? 'Комната с таким названием уже существует.'
            : `Ошибка создания комнаты (${res.status}).`;
        setError(message);
        return;
      }

      const data = await res.json() as CreateRoomResponse;
      setSuccessState({ idRoom: data.idRoom, url: data.url });
      setPhase('success');
    } catch {
      setError('Сетевая ошибка. Проверьте соединение.');
    } finally {
      setIsLoading(false);
    }
  }

  // ── Copy ──────────────────────────────────────────────────────────────────

  async function handleCopy() {
    if (!successState) return;
    const urlToCopy = successState.url;

    try {
      await navigator.clipboard.writeText(urlToCopy);
    } catch {
      // Fallback for contexts that block the Clipboard API (e.g. insecure origin,
      // permissions policy, or older browsers).
      const textarea          = document.createElement('textarea');
      textarea.value          = urlToCopy;
      textarea.style.position = 'fixed';
      textarea.style.opacity  = '0';
      document.body.appendChild(textarea);
      textarea.select();
      // execCommand is deprecated but remains the only synchronous clipboard
      // fallback that works in all blocked-clipboard environments.
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }

    setCopyLabel('Скопировано!');
    // Second click resets the timer — clearTimeout on the existing ref prevents
    // a stale timeout from reverting the label while a new 2s window is running.
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => {
      setCopyLabel('Копировать');
    }, 2000);
  }

  // ── Navigate to room ──────────────────────────────────────────────────────

  function handleStartInterview() {
    if (!successState) return;
    // No replace — interviewer can navigate back if they clicked too early.
    navigate(`/interviewer/sessions/${successState.idRoom}`);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const fieldGroupStyle = { opacity: phase === 'success' ? 0.5 : 1 };

  return (
    <div className={styles.createPage}>

      {/* ── Header ── */}
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Новое интервью</h1>
        <p className={styles.pageSubtitle}>
          Заполните данные для создания комнаты
        </p>
      </div>

      {/* ── Form ── */}
      <form
        className={styles.createForm}
        onSubmit={(e) => { void handleSubmit(e); }}
      >
        {/* Название комнаты */}
        <div className={styles.fieldGroup} style={fieldGroupStyle}>
          <label htmlFor="create-title" className={styles.label}>
            Название комнаты
          </label>
          <input
            id="create-title"
            type="text"
            className={styles.input}
            placeholder="Например: Алгоритмы — Павел"
            value={titleRoom}
            onChange={(e) => setTitleRoom(e.target.value)}
            disabled={phase === 'success'}
          />
        </div>

        {/* Вакансия */}
        <div className={styles.fieldGroup} style={fieldGroupStyle}>
          <label htmlFor="create-vacancy" className={styles.label}>
            Вакансия
          </label>
          <input
            id="create-vacancy"
            type="text"
            className={styles.input}
            placeholder="Например: Kotlin Developer"
            value={nameVacancy}
            onChange={(e) => setNameVacancy(e.target.value)}
            disabled={phase === 'success'}
          />
        </div>

        {/* Error message — shown only when present */}
        {error !== null && (
          <p className={styles.formError} role="alert" aria-live="polite">
            {error}
          </p>
        )}

        {/* Submit — hidden after success, disabled when inputs are incomplete */}
        {phase === 'form' && (
          <button
            type="submit"
            className={styles.submitBtn}
            disabled={!canSubmit}
          >
            {isLoading ? (
              <span className={styles.spinner} aria-label="Создание…" />
            ) : (
              'Создать комнату'
            )}
          </button>
        )}
      </form>

      {/* ── Success block — rendered only after POST succeeds ── */}
      {phase === 'success' && successState !== null && (
        <div className={styles.successBlock}>
          <p className={styles.successLabel}>Ссылка для кандидата</p>

          {/* Code-block-style URL row */}
          <div className={styles.urlBlock}>
            <span className={styles.urlText} title={successState.url}>
              {successState.url}
            </span>
            <button
              type="button"
              className={`${styles.copyBtn} ${
                copyLabel === 'Скопировано!' ? styles.copyBtnCopied : ''
              }`}
              onClick={() => { void handleCopy(); }}
            >
              {copyLabel}
            </button>
          </div>

          <p className={styles.successHint}>
            Отправьте эту ссылку кандидату перед началом интервью.
          </p>

          <button
            type="button"
            className={styles.startBtn}
            onClick={handleStartInterview}
          >
            Начать интервью →
          </button>
        </div>
      )}

    </div>
  );
}
