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

const STATUS_LABEL_RU: Record<StatusBadgeProps['status'], string> = {
  CREATED:  'ОЖИДАНИЕ',
  ACTIVE:   'АКТИВНО',
  FINISHED: 'ЗАВЕРШЕНО',
};

const StatusBadge = memo(function StatusBadge({ status }: StatusBadgeProps) {
  const variant =
    status === 'ACTIVE'   ? styles.badgeActive
    : status === 'CREATED' ? styles.badgeCreated
    :                       styles.badgeFinished;
  return (
    <span className={`${styles.statusBadge} ${variant}`}>
      <span className={styles.dot} />
      {STATUS_LABEL_RU[status]}
    </span>
  );
});

export default StatusBadge;
