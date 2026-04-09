import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { AdminUser } from './UserRow';
import styles from './CreateUserModal.module.css';

interface UpdateUserResponse {
  id: string;
  name: string;
  email: string;
  role: 'HR' | 'INTERVIEWER' | 'SUPERUSER';
  createdAt: string;
}

export interface EditUserModalProps {
  isOpen: boolean;
  token: string;
  user: AdminUser | null;
  onClose: () => void;
  onSuccess: (updatedUser: AdminUser) => void;
}

export default function EditUserModal({
  isOpen,
  token,
  user,
  onClose,
  onSuccess,
}: EditUserModalProps) {
  if (!isOpen || user === null) return null;
  return (
    <EditUserModalContent
      token={token}
      user={user}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}

interface ContentProps {
  token: string;
  user: AdminUser;
  onClose: () => void;
  onSuccess: (updatedUser: AdminUser) => void;
}

function isEditableStaffRole(r: AdminUser['role']): r is 'HR' | 'INTERVIEWER' {
  return r === 'HR' || r === 'INTERVIEWER';
}

function EditUserModalContent({
  token,
  user,
  onClose,
  onSuccess,
}: ContentProps) {
  const isSuperuserAccount = user.role === 'SUPERUSER';
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState<'HR' | 'INTERVIEWER'>(() =>
    isEditableStaffRole(user.role) ? user.role : 'INTERVIEWER',
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = name.trim() && email.trim() && !isSubmitting;

  const handleSave = useCallback(async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const body: Record<string, string> = {
        name: name.trim(),
        email: email.trim(),
      };
      if (!isSuperuserAccount) {
        body.role = role;
      }
      const res = await fetch(`/api/v1/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setError(`Ошибка сохранения (${res.status})`);
        return;
      }
      const data = (await res.json()) as UpdateUserResponse;
      onSuccess({
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role,
        createdAt: data.createdAt,
      });
      onClose();
    } catch {
      setError('Сетевая ошибка при сохранении');
    } finally {
      setIsSubmitting(false);
    }
  }, [canSubmit, email, isSuperuserAccount, name, onClose, onSuccess, role, token, user.id]);

  const modal = (
    <div className={styles.modalOverlay}>
      <div className={styles.modalCard} role="dialog" aria-modal="true">
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Редактировать пользователя</h2>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="eu-name">Имя</label>
            <input id="eu-name" className={styles.input} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="eu-email">Email</label>
            <input id="eu-email" className={styles.input} value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Роль</label>
            {isSuperuserAccount ? (
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted, #9090c0)' }}>
                Суперпользователь — роль не меняется через эту форму.
              </p>
            ) : (
              <div className={styles.roleSelect}>
                <button type="button" className={styles.roleBtn} data-active={role === 'INTERVIEWER'} onClick={() => setRole('INTERVIEWER')}>
                  Interviewer
                </button>
                <button type="button" className={styles.roleBtn} data-active={role === 'HR'} onClick={() => setRole('HR')}>
                  HR
                </button>
              </div>
            )}
          </div>
          {error && <p className={styles.formError}>{error}</p>}
          <div className={styles.modalActions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>Отмена</button>
            <button type="button" className={styles.submitBtn} onClick={() => void handleSave()} disabled={!canSubmit}>
              {isSubmitting ? 'Сохраняем...' : 'Сохранить'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
