/**
 * SessionRow — single row in the interviewer sessions list.
 *
 * The entire row is the click target — status badge is display only.
 * Keyboard accessible: Tab to focus, Enter/Space to navigate.
 *
 * Memoized: re-renders only when the `room` object reference changes.
 * The parent should pass a stable reference (e.g. from the fetched array)
 * rather than a reconstructed object literal.
 */

import { memo, type KeyboardEvent } from 'react';
import StatusBadge from './StatusBadge';
import { formatDate } from '@/utils/formatDate';
import styles from './SessionRow.module.css';

export interface RoomSummary {
  idRoom:        string;
  nameCandidate: string | null;
  status:        'ACTIVE' | 'FINISHED';
  dateStart:     string;
  dateEnd:       string | null;
  timeOffset:    string;
}

export interface SessionRowProps {
  room:    RoomSummary;
  onClick: (room: RoomSummary) => void;
}

// formatDate re-exported so existing importers of this symbol from SessionRow
// continue to work without changes.
export { formatDate };

const SessionRow = memo(function SessionRow({ room, onClick }: SessionRowProps) {
  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault(); // prevent Space from scrolling the page
      onClick(room);
    }
  }

  return (
    <div
      role="listitem"
      className={styles.sessionRow}
      tabIndex={0}
      onClick={() => onClick(room)}
      onKeyDown={handleKeyDown}
    >
      <div className={styles.rowLeft}>
        <span className={styles.candidateName}>
          {room.nameCandidate ?? 'Аноним'}
        </span>
        <StatusBadge status={room.status} />
      </div>

      <span className={styles.rowDate}>
        {formatDate(room.dateStart)}
      </span>

      <span className={styles.rowDuration}>
        {room.timeOffset}
      </span>
    </div>
  );
});

export default SessionRow;
