/**
 * StatusBadge — inline status indicator for interview sessions.
 *
 * Display only — not interactive, not a click target.
 * Memoized: re-renders only when status string changes.
 */

import { memo } from 'react';
import styles from './StatusBadge.module.css';

export interface StatusBadgeProps {
  status: 'CREATED' | 'ACTIVE' | 'FINISHED';
}

const StatusBadge = memo(function StatusBadge({ status }: StatusBadgeProps) {
  const variant =
    status === 'ACTIVE'   ? styles.badgeActive
    : status === 'CREATED' ? styles.badgeCreated
    :                       styles.badgeFinished;
  return (
    <span className={`${styles.statusBadge} ${variant}`}>
      <span className={styles.dot} />
      {status}
    </span>
  );
});

export default StatusBadge;
