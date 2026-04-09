/**
 * VerdictModal — two-step interview conclusion flow.
 *
 * Step 1: Four star-rating criteria (System Design, Code Readability,
 *         Communication Skills, Coachability). "Далее →" is blocked until
 *         all four scores are 1-5. Going back from step 2 preserves scores.
 *
 * Step 2: Read-only score summary + binary verdict selector (ПРОЙДЕНО /
 *         НЕ ПРОЙДЕНО). Confirm fires two sequential API calls:
 *           A) POST analytics …/interviewer-assessment (404/405 — сервис отключён)
 *           B) PATCH core …/finish/{idRoom}
 *           C) POST analytics …/history (снимки + заметки из core, best-effort)
 *
 * Unmount pattern: returns null when isOpen is false, resetting all local
 * state automatically when the modal reopens.
 *
 * Rendered via ReactDOM.createPortal to document.body — avoids stacking
 * context issues with AppLayout and CodeViewer layers.
 *
 * Backdrop click does NOT close — this is a permanent action.
 */

import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { analyticsApiUrl } from '@/api/analyticsClient';
import { pushSessionHistoryToAnalytics } from '@/api/analyticsSessionHistory';
import StarRating from './StarRating';
import StepIndicator from './StepIndicator';
import styles from './VerdictModal.module.css';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ModalStep = 1 | 2;
type Verdict   = 'PASSED' | 'FAILED' | null;

interface AssessmentScores {
  systemDesign:        number;
  codeReadability:     number;
  communicationSkills: number;
  coachability:        number;
}

// Validated API body shapes — satisfies operator enforces structural match.
interface AssessmentBody {
  systemDesign:        number;
  codeReadability:     number;
  communicationSkills: number;
  coachability:        number;
  verdict:             'PASSED' | 'FAILED';
}

interface FinishBody {
  codeResolution: 'PASSED' | 'REJECTED';
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CRITERIA_LABELS: Record<keyof AssessmentScores, string> = {
  systemDesign:        'System Design',
  codeReadability:     'Code Readability',
  communicationSkills: 'Communication Skills',
  coachability:        'Coachability',
};

const INITIAL_SCORES: AssessmentScores = {
  systemDesign:        0,
  codeReadability:     0,
  communicationSkills: 0,
  coachability:        0,
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface VerdictModalProps {
  idRoom:    string;
  token:     string;
  isOpen:    boolean;
  onClose:   () => void;  // cancel — no API calls
  onSuccess: () => void;  // called after both API calls succeed — parent navigates
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function VerdictModal({
  idRoom,
  token,
  isOpen,
  onClose,
  onSuccess,
}: VerdictModalProps) {
  // Unmount when closed — state resets automatically on next open
  if (!isOpen) return null;

  return <VerdictModalContent
    idRoom={idRoom}
    token={token}
    onClose={onClose}
    onSuccess={onSuccess}
  />;
}

// Inner component holds all hooks — exists so the `if (!isOpen) return null`
// guard above doesn't violate Rules of Hooks (hooks run unconditionally here).
interface ContentProps {
  idRoom:    string;
  token:     string;
  onClose:   () => void;
  onSuccess: () => void;
}

function VerdictModalContent({ idRoom, token, onClose, onSuccess }: ContentProps) {
  const [step,         setStep]         = useState<ModalStep>(1);
  const [scores,       setScores]       = useState<AssessmentScores>(INITIAL_SCORES);
  const [verdict,      setVerdict]      = useState<Verdict>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  // ── Derived ─────────────────────────────────────────────────────────────

  const canProceed  = Object.values(scores).every((v) => v >= 1);
  const canSubmit   = verdict !== null && !isSubmitting;

  // ── Score setter factory ─────────────────────────────────────────────────

  function setScore(field: keyof AssessmentScores) {
    return (n: number) =>
      setScores((prev) => ({ ...prev, [field]: n }));
  }

  // ── Sequential API submission ────────────────────────────────────────────

  const handleConfirm = useCallback(async () => {
    if (!verdict) return;

    setIsSubmitting(true);
    setError(null);

    // ── Step A: POST assessment (some deployments omit this route) ─────────
    try {
      const assessRes = await fetch(
        analyticsApiUrl(`/api/v1/rooms/${idRoom}/interviewer-assessment`),
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            systemDesign:        scores.systemDesign,
            codeReadability:     scores.codeReadability,
            communicationSkills: scores.communicationSkills,
            coachability:        scores.coachability,
            verdict,
          } satisfies AssessmentBody),
        },
      );
      const absent = assessRes.status === 404 || assessRes.status === 405;
      if (!assessRes.ok && !absent) {
        throw new Error(`Assessment failed (${assessRes.status})`);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? `Ошибка оценки: ${err.message}. Попробуйте ещё раз.`
          : 'Не удалось сохранить оценку.',
      );
      setIsSubmitting(false);
      return;
    }

    // ── Step B: PATCH finish ───────────────────────────────────────────────
    // 'FAILED' → codeResolution: 'REJECTED' (different strings — API contract).
    try {
      const codeResolution: 'PASSED' | 'REJECTED' =
        verdict === 'PASSED' ? 'PASSED' : 'REJECTED';

      const finishRes = await fetch(`/api/v1/rooms/finish/${idRoom}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ codeResolution } satisfies FinishBody),
      });
      if (!finishRes.ok) {
        throw new Error(`Finish failed (${finishRes.status})`);
      }

      await pushSessionHistoryToAnalytics(idRoom, token);

      // Component will unmount via parent navigation.
      onSuccess();
    } catch (err) {
      setError(
        err instanceof Error
          ? `Интервью не завершено: ${err.message}. Попробуйте ещё раз.`
          : 'Не удалось завершить интервью.',
      );
      // Assessment was already saved — retry is acceptable (server is idempotent).
      setIsSubmitting(false);
    }
  }, [scores, verdict, idRoom, token, onSuccess]);

  // ── Score summary for step 2 ─────────────────────────────────────────────

  const summaryRow = `SD: ${scores.systemDesign} · CR: ${scores.codeReadability} · CS: ${scores.communicationSkills} · CO: ${scores.coachability}`;

  // ── Portal contents ──────────────────────────────────────────────────────

  const modal = (
    <div className={styles.modalOverlay}>
      <div
        className={styles.modalCard}
        role="dialog"
        aria-modal="true"
        aria-labelledby="verdict-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <StepIndicator currentStep={step} />

        {/* ── Step 1: rate each criterion ── */}
        {step === 1 && (
          <div>
            <div className={styles.modalHeader}>
              <h2 id="verdict-modal-title" className={styles.modalTitle}>
                Оценка кандидата
              </h2>
              <button
                type="button"
                className={styles.closeBtn}
                aria-label="Закрыть"
                onClick={onClose}
              >
                ✕
              </button>
            </div>

            <div className={styles.criteriaList}>
              {(Object.entries(CRITERIA_LABELS) as [keyof AssessmentScores, string][]).map(
                ([key, label]) => (
                  <StarRating
                    key={key}
                    label={label}
                    value={scores[key]}
                    onChange={setScore(key)}
                  />
                ),
              )}
            </div>

            <div className={styles.step1Actions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={onClose}
              >
                Отмена
              </button>
              <button
                type="button"
                className={styles.nextBtn}
                disabled={!canProceed}
                onClick={() => setStep(2)}
              >
                Далее →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: verdict selection ── */}
        {step === 2 && (
          <div>
            <div className={styles.modalHeader}>
              <h2 id="verdict-modal-title" className={styles.modalTitle}>
                Итог интервью
              </h2>
              <button
                type="button"
                className={styles.closeBtn}
                aria-label="Закрыть"
                disabled={isSubmitting}
                onClick={onClose}
              >
                ✕
              </button>
            </div>

            {/* Read-only score summary */}
            <div className={styles.scoreSummary}>
              <div className={styles.summaryRow}>{summaryRow}</div>
              <div className={styles.summaryCaption}>
                SD = System Design · CR = Code Readability · CS = Communication · CO = Coachability
              </div>
            </div>

            {/* Verdict selector */}
            <div className={styles.verdictSection}>
              <label className={styles.verdictLabel}>Вердикт</label>
              <div className={styles.verdictBtns}>
                <button
                  type="button"
                  className={`${styles.verdictBtn} ${verdict === 'PASSED' ? styles.verdictBtnPassedActive : ''}`}
                  onClick={() => setVerdict('PASSED')}
                >
                  ПРОЙДЕНО
                </button>
                <button
                  type="button"
                  className={`${styles.verdictBtn} ${verdict === 'FAILED' ? styles.verdictBtnFailedActive : ''}`}
                  onClick={() => setVerdict('FAILED')}
                >
                  НЕ ПРОЙДЕНО
                </button>
              </div>
            </div>

            {/* Error — styled container, replaces spinner (not overlaid) */}
            {error !== null && (
              <p className={styles.modalError} role="alert" aria-live="assertive">
                {error}
              </p>
            )}

            {/* Step 2 actions */}
            <div className={styles.step2Actions}>
              {/* Confirm — red, full width, spinner while submitting */}
              <button
                type="button"
                className={styles.confirmBtn}
                disabled={!canSubmit}
                // Enter key intentionally NOT a shortcut — too easy to trigger accidentally
                onClick={() => { void handleConfirm(); }}
              >
                {isSubmitting ? (
                  <span className={styles.spinner} aria-label="Сохранение…" />
                ) : (
                  'Завершить и сохранить'
                )}
              </button>

              {/* Back + Cancel row */}
              <div className={styles.backAndCancel}>
                <button
                  type="button"
                  className={styles.backBtn}
                  disabled={isSubmitting}
                  onClick={() => { setStep(1); setError(null); }}
                >
                  ← Назад
                </button>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  disabled={isSubmitting}
                  onClick={onClose}
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
