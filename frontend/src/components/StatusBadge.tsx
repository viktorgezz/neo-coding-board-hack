/**
 * StatusBadge — inline status indicator for interview sessions.
 *
 * Display only — not interactive, not a click target.
 * Memoized: re-renders only when status string changes.
 */

import { memo } from 'react';
import styles from './StatusBadge.module.css';

export interface StatusBadgeProps {
  status: 'ACTIVE' | 'FINISHED';
}

const StatusBadge = memo(function StatusBadge({ status }: StatusBadgeProps) {
  const isActive = status === 'ACTIVE';
  return (
    <span
      className={`${styles.statusBadge} ${isActive ? styles.badgeActive : styles.badgeFinished}`}
    >
      <span className={styles.dot} />
      {status}
    </span>
  );
});

export default StatusBadge;
