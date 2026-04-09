/**
 * VerdictBadge — displays interview outcome as a colored pill.
 *
 * Priority logic:
 *   1. codeResolution === 'PASSED'   → green  "ПРОЙДЕНО"
 *   2. codeResolution === 'REJECTED' → red    "НЕ ПРОЙДЕНО"
 *   3. status === 'ACTIVE'           → dark + green dot + "ACTIVE"
 *   4. status === 'FINISHED'         → dark gray "ЗАВЕРШЕНО"
 *
 * codeResolution is optional — the list API may not include it.
 * Guard with optional chaining at the call site: room.codeResolution ?? null.
 *
 * React.memo: re-renders only when status or codeResolution changes.
 */

import { memo } from 'react';
import styles from './VerdictBadge.module.css';

export interface VerdictBadgeProps {
  status:          'ACTIVE' | 'FINISHED';
  codeResolution?: 'PASSED' | 'REJECTED' | null;
}

const VerdictBadge = memo(function VerdictBadge({
  status,
  codeResolution,
}: VerdictBadgeProps) {
  if (codeResolution === 'PASSED') {
    return (
      <span className={`${styles.badge} ${styles.badgePassed}`}>
        ПРОЙДЕНО
      </span>
    );
  }

  if (codeResolution === 'REJECTED') {
    return (
      <span className={`${styles.badge} ${styles.badgeRejected}`}>
        НЕ ПРОЙДЕНО
      </span>
    );
  }

  if (status === 'ACTIVE') {
    return (
      <span className={`${styles.badge} ${styles.badgeActive}`}>
        <span className={styles.activeDot} />
        ACTIVE
      </span>
    );
  }

  // FINISHED with no codeResolution — verdict not yet available in list response
  return (
    <span className={`${styles.badge} ${styles.badgeFinished}`}>
      ЗАВЕРШЕНО
    </span>
  );
});

export default VerdictBadge;
