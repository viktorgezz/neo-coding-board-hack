/**
 * UserRow — single row in the admin users table.
 *
 * Four-column grid: name+email | role badge | created date | delete button.
 *
 * Self-deletion guard: delete button is NOT rendered when user.id matches
 * currentUserId — removes the element entirely (not just visually hidden).
 *
 * For all other rows the delete button is in the DOM at opacity: 0,
 * revealed by the CSS rule ".userRow:hover .deleteBtn { opacity: 1 }".
 *
 * React.memo: re-renders only when user object or currentUserId changes.
 */

import { memo } from 'react';
import { Trash2 } from 'lucide-react';
import RoleBadge from './RoleBadge';
import { formatDate } from '@/utils/formatDate';
import styles from './UserRow.module.css';

export interface AdminUser {
  id:        string;
  name:      string;
  email:     string;
  role:      'HR' | 'INTERVIEWER';
  createdAt: string; // ISO date-time
}

export interface UserRowProps {
  user:          AdminUser;
  currentUserId: string | null;
  onDelete:      (user: AdminUser) => void;
}

const UserRow = memo(function UserRow({
  user,
  currentUserId,
  onDelete,
}: UserRowProps) {
  const isSelf = user.id === currentUserId;

  return (
    <div
      role="listitem"
      className={styles.userRow}
      tabIndex={0}
    >
      <div className={styles.userIdentity}>
        <span className={styles.userName}>{user.name}</span>
        <span className={styles.userEmail}>{user.email}</span>
      </div>

      <div className={styles.roleCell}>
        <RoleBadge role={user.role} />
      </div>

      <span className={styles.dateCell}>
        {formatDate(user.createdAt)}
      </span>

      <div className={styles.actionsCell}>
        {/* Delete button hidden for current user — prevents self-deletion */}
        {!isSelf && (
          <button
            type="button"
            className={styles.deleteBtn}
            aria-label={`Удалить ${user.name}`}
            onClick={() => onDelete(user)}
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
});

export default UserRow;
