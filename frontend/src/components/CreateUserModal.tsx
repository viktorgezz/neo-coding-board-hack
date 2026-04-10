/**
 * CreateUserModal — modal for provisioning new HR/INTERVIEWER accounts.
 *
 * Two phases:
 *   'form'    — four fields (name, login, role toggle, password) + submit.
 *   'success' — credential display with one-time password + copy button.
 *
 * The modal stays open after success so the admin can copy credentials.
 * Closing in either phase calls onClose() — parent sets isOpen to false.
 *
 * Unmount pattern: returns null when isOpen is false, which resets all
 * local state automatically when the modal reopens.
 *
 * Rendered via ReactDOM.createPortal to document.body — avoids stacking
 * context issues with AppLayout. Backdrop click does NOT close the modal.
 *
 * All API calls include TODO markers — endpoints are not confirmed with backend.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import styles from './CreateUserModal.module.css';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Тело POST /api/v1/auth/register (RegistrationRequest в Java). */
interface RegisterStaffRequest {
  username: string;
  password: string;
  role:     'INTERVIEWER' | 'HR';
}

interface CreatedCredentials {
  login:             string;
  role:              'HR' | 'INTERVIEWER';
  temporaryPassword: string;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface CreateUserModalProps {
  isOpen:    boolean;
  token:     string;
  onClose:   () => void;
  /** После успешного POST /api/v1/auth/register — обновить список (например refetch). */
  onSuccess: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CreateUserModal({
  isOpen,
  token,
  onClose,
  onSuccess,
}: CreateUserModalProps) {
  // Unmount when closed — all state resets automatically on next open
  if (!isOpen) return null;

  return (
    <CreateUserModalContent
      token={token}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}

// Inner component holds all hooks so the guard above doesn't violate Rules of Hooks.
interface ContentProps {
  token:     string;
  onClose:   () => void;
  onSuccess: () => void;
}

function CreateUserModalContent({ token, onClose, onSuccess }: ContentProps) {
  // ── Form state ────────────────────────────────────────────────────────────
  const [name,              setName]              = useState('');
  const [login,             setLogin]             = useState('');
  const [role,              setRole]              = useState<'HR' | 'INTERVIEWER'>('INTERVIEWER');
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [showPassword,      setShowPassword]      = useState(false);
  const [isSubmitting,      setIsSubmitting]      = useState(false);
  const [error,             setError]             = useState<string | null>(null);

  // ── Phase state ───────────────────────────────────────────────────────────
  const [phase,          setPhase]          = useState<'form' | 'success'>('form');
  const [createdCreds,   setCreatedCreds]   = useState<CreatedCredentials | null>(null);

  // ── Copy button ───────────────────────────────────────────────────────────
  const [copyLabel,    setCopyLabel]    = useState<'Копировать' | 'Скопировано!'>('Копировать');
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  // ── Derived ───────────────────────────────────────────────────────────────
  const canSubmit =
    login.trim().length > 0 &&
    name.trim().length > 0 &&
    temporaryPassword.trim().length > 0 &&
    !isSubmitting;

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleCreate = useCallback(async () => {
    const trimmedLogin    = login.trim();
    const trimmedName     = name.trim();
    const trimmedPassword = temporaryPassword.trim();

    if (!trimmedLogin || !trimmedName || !trimmedPassword) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/auth/register', {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: trimmedLogin,
          password: trimmedPassword,
          role,
        } satisfies RegisterStaffRequest),
      });

      if (!res.ok) {
        const message =
          res.status === 409
            ? 'Пользователь с таким логином уже существует.'
            : `Ошибка создания (${res.status}). Проверьте данные.`;
        setError(message);
        return;
      }

      const displayPassword = trimmedPassword;

      setCreatedCreds({
        login:             trimmedLogin,
        role,
        temporaryPassword: displayPassword,
      });
      setPhase('success');

      onSuccess();
    } catch {
      setError('Сетевая ошибка. Проверьте соединение.');
    } finally {
      setIsSubmitting(false);
    }
  }, [login, name, temporaryPassword, role, token, onSuccess]);

  // ── Copy password ─────────────────────────────────────────────────────────
  const handleCopyPassword = useCallback(async () => {
    if (!createdCreds) return;
    const pwToCopy = createdCreds.temporaryPassword;

    try {
      await navigator.clipboard.writeText(pwToCopy);
    } catch {
      // Fallback for contexts that block the Clipboard API
      const textarea          = document.createElement('textarea');
      textarea.value          = pwToCopy;
      textarea.style.position = 'fixed';
      textarea.style.opacity  = '0';
      document.body.appendChild(textarea);
      textarea.select();
      // execCommand is deprecated but remains the reliable clipboard fallback
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }

    setCopyLabel('Скопировано!');
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => {
      setCopyLabel('Копировать');
    }, 2000);
  }, [createdCreds]);

  // ── Portal ────────────────────────────────────────────────────────────────
  const modal = (
    <div className={styles.modalOverlay}>
      <div
        className={styles.modalCard}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-user-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        {phase === 'form' ? (
          /* ── Form phase ── */
          <>
            <div className={styles.modalHeader}>
              <h2 id="create-user-modal-title" className={styles.modalTitle}>
                Новый пользователь
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Имя */}
              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="cu-name">Имя</label>
                <input
                  id="cu-name"
                  type="text"
                  className={styles.input}
                  placeholder="Иван Петров"
                  autoComplete="off"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              {/* Логин (username в системе) */}
              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="cu-login">Логин</label>
                <input
                  id="cu-login"
                  type="text"
                  className={styles.input}
                  placeholder="Например: ivan.petrov"
                  autoComplete="username"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                />
              </div>

              {/* Роль */}
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Роль</label>
                <div className={styles.roleSelect}>
                  <button
                    type="button"
                    className={styles.roleBtn}
                    data-active={role === 'INTERVIEWER'}
                    data-role="INTERVIEWER"
                    onClick={() => setRole('INTERVIEWER')}
                  >
                    Interviewer
                  </button>
                  <button
                    type="button"
                    className={styles.roleBtn}
                    data-active={role === 'HR'}
                    data-role="HR"
                    onClick={() => setRole('HR')}
                  >
                    HR
                  </button>
                </div>
              </div>

              {/* Временный пароль */}
              <div className={styles.fieldGroup}>
                <label className={styles.label} htmlFor="cu-password">Временный пароль</label>
                <div className={styles.passwordInputRow}>
                  <input
                    id="cu-password"
                    type={showPassword ? 'text' : 'password'}
                    className={styles.input}
                    placeholder="Мин. 8 символов"
                    autoComplete="new-password"
                    value={temporaryPassword}
                    style={{ flex: 1 }}
                    onChange={(e) => setTemporaryPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className={styles.togglePwBtn}
                    aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                    onClick={() => setShowPassword((p) => !p)}
                  >
                    {showPassword ? '🙈' : '👁'}
                  </button>
                </div>
              </div>

              {error !== null && (
                <p className={styles.formError} role="alert" aria-live="polite">
                  {error}
                </p>
              )}

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  disabled={isSubmitting}
                  onClick={onClose}
                >
                  Отмена
                </button>
                <button
                  type="button"
                  className={styles.submitBtn}
                  disabled={!canSubmit}
                  onClick={() => { void handleCreate(); }}
                >
                  {isSubmitting ? (
                    <span className={styles.spinner} aria-label="Создание…" />
                  ) : (
                    'Создать'
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          /* ── Success phase — show credentials before admin closes ── */
          <div className={styles.successContent}>
            <p className={styles.successTitle}>Пользователь создан</p>

            <div className={styles.credentialBlock}>
              <div className={styles.credRow}>
                <span className={styles.credLabel}>Логин</span>
                <span className={styles.credValue}>{createdCreds?.login}</span>
              </div>
              <div className={styles.credRow}>
                <span className={styles.credLabel}>Роль</span>
                <span className={styles.credValue}>{createdCreds?.role}</span>
              </div>
              <div className={styles.credRow}>
                <span className={styles.credLabel}>Временный пароль</span>
                <div className={styles.passwordRow}>
                  <span className={styles.credValue}>
                    {createdCreds?.temporaryPassword}
                  </span>
                  <button
                    type="button"
                    className={styles.copyPwBtn}
                    onClick={() => { void handleCopyPassword(); }}
                  >
                    {copyLabel}
                  </button>
                </div>
              </div>
            </div>

            <p className={styles.warningText}>
              ⚠ Сохраните пароль — он больше не будет показан.
            </p>

            <button
              type="button"
              className={styles.closeSuccessBtn}
              onClick={onClose}
            >
              Закрыть
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
