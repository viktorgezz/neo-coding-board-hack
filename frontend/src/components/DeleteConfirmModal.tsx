/**
 * DeleteConfirmModal — confirmation dialog before deleting a staff user.
 *
 * Shows the user's name and email in the body so the admin can confirm
 * they are deleting the correct account. No undo is possible.
 *
 * Unmount pattern: returns null when isOpen is false, resetting state.
 * Backdrop click does NOT close — deletion is permanent, must be explicit.
 *
 * Rendered via ReactDOM.createPortal to document.body.
 *
 * All API calls include TODO markers — endpoints are not confirmed with backend.
 */

import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { AdminUser } from './UserRow';
import styles from './DeleteConfirmModal.module.css';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface DeleteConfirmModalProps {
  isOpen:    boolean;
  user:      AdminUser | null;
  token:     string;
  onClose:   () => void;
  onSuccess: (deletedId: string) => void; // remove from parent list
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DeleteConfirmModal({
  isOpen,
  user,
  token,
  onClose,
  onSuccess,
}: DeleteConfirmModalProps) {
  // Unmount when closed — state resets automatically on next open
  if (!isOpen || !user) return null;

  return (
    <DeleteConfirmContent
      user={user}
      token={token}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}

// Inner component holds all hooks — outer guard keeps them unconditional here.
interface ContentProps {
  user:      AdminUser;
  token:     string;
  onClose:   () => void;
  onSuccess: (deletedId: string) => void;
}

function DeleteConfirmContent({ user, token, onClose, onSuccess }: ContentProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/v1/users/${user.id}`, {
        method:  'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        setError(`Не удалось удалить пользователя (${res.status}).`);
        return;
      }

      // Optimistic: parent filters out the deleted user immediately
      onSuccess(user.id);
      onClose();
    } catch {
      setError('Сетевая ошибка при удалении.');
    } finally {
      setIsDeleting(false);
    }
  }, [user.id, token, onSuccess, onClose]);

  const modal = (
    <div className={styles.modalOverlay}>
      <div
        className={styles.deleteCard}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="delete-modal-title" className={styles.deleteTitle}>
          Удалить пользователя?
        </h2>

        <p className={styles.deleteBody}>
          «{user.name}» ({user.email}) будет удалён без возможности восстановления.
        </p>

        {error !== null && (
          <p className={styles.deleteError} role="alert" aria-live="assertive">
            {error}
          </p>
        )}

        <div className={styles.deleteActions}>
          <button
            type="button"
            className={styles.cancelBtn}
            disabled={isDeleting}
            onClick={onClose}
          >
            Отмена
          </button>
          <button
            type="button"
            className={styles.confirmDeleteBtn}
            disabled={isDeleting}
            onClick={() => { void handleDelete(); }}
          >
            {isDeleting ? (
              <span className={styles.spinner} aria-label="Удаление…" />
            ) : (
              'Удалить'
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
