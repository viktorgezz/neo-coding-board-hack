/**
 * CandidateRow — single row in the HR candidates list.
 *
 * Four-column grid: candidate name | date | duration | verdict badge.
 * The entire row is the click target — verdict badge is display only.
 * Keyboard accessible: Tab to focus, Enter/Space navigates.
 *
 * Extends the base RoomSummary shape with the optional codeResolution field
 * that the /rooms/all endpoint may or may not return depending on backend version.
 *
 * Memoized: re-renders only when room.idRoom changes (stable reference from fetch array).
 */

import { memo, type KeyboardEvent } from 'react';
import VerdictBadge from './VerdictBadge';
import { formatDate } from '@/utils/formatDate';
import styles from './CandidateRow.module.css';

export interface HRRoomSummary {
  idRoom:          string;
  nameCandidate:   string | null;
  status:          'CREATED' | 'ACTIVE' | 'FINISHED';
  dateStart:       string;
  dateEnd:         string | null;
  timeOffset:      string;
  /** Optional — backend may not include it in list responses yet. */
  codeResolution?: 'PASSED' | 'REJECTED' | null;
}

export interface CandidateRowProps {
  room:    HRRoomSummary;
  onClick: (idRoom: string) => void;
}

const CandidateRow = memo(function CandidateRow({ room, onClick }: CandidateRowProps) {
  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(room.idRoom);
    }
  }

  return (
    <div
      role="listitem"
      className={styles.candidateRow}
      tabIndex={0}
      onClick={() => onClick(room.idRoom)}
      onKeyDown={handleKeyDown}
    >
      <span className={styles.candidateName}>
        {room.nameCandidate ?? 'Аноним'}
      </span>

      <span className={styles.dateCell}>
        {formatDate(room.dateStart)}
      </span>

      <span className={styles.durationCell}>
        {room.timeOffset}
      </span>

      <div className={styles.verdictCell}>
        <VerdictBadge
          status={room.status}
          codeResolution={room.codeResolution ?? null}
        />
      </div>
    </div>
  );
});

export default CandidateRow;
