/**
 * RoleBadge — staff role indicator pill.
 *
 * HR:          blue tint  (#1e3a5f bg, #60a5fa text)
 * INTERVIEWER: indigo tint (#1a1a2e bg, #818cf8 text)
 *
 * Colors intentionally differ from VerdictBadge to avoid role/verdict confusion.
 * React.memo: re-renders only when role changes.
 */

import { memo } from 'react';
import styles from './RoleBadge.module.css';

export interface RoleBadgeProps {
  role: 'HR' | 'INTERVIEWER' | 'SUPERUSER';
}

const RoleBadge = memo(function RoleBadge({ role }: RoleBadgeProps) {
  const cls =
    role === 'HR' ? styles.badgeHR
    : role === 'SUPERUSER' ? styles.badgeSuperuser
    : styles.badgeInterviewer;
  const label =
    role === 'SUPERUSER' ? 'АДМИН' : role;
  return (
    <span className={`${styles.roleBadge} ${cls}`}>
      {label}
    </span>
  );
});

export default RoleBadge;
