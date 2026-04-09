/**
 * NoteRow — single timestamped note in the interviewer notes panel.
 *
 * Delete button is invisible by default and revealed on hover via CSS
 * (.noteRow:hover .deleteBtn). It stays in the normal flow so its column
 * space is always reserved — no layout shift when hovering.
 *
 * Memoized: re-renders only when note.id or onDelete reference changes.
 */

import { memo } from 'react';
import styles from './NoteRow.module.css';

export interface NoteResponse {
  id:          string;
  textContent: string;
  /** "mm:ss" — rendered as-is, never reformatted by the frontend. */
  timeOffset:  string;
  timeCreated: string;
}

export interface NoteRowProps {
  note:     NoteResponse;
  onDelete: (idNote: string) => void;
}

const NoteRow = memo(function NoteRow({ note, onDelete }: NoteRowProps) {
  return (
    <div className={styles.noteRow}>
      <span className={styles.noteTime}>{note.timeOffset}</span>
      <span className={styles.noteText}>{note.textContent}</span>
      <button
        type="button"
        className={styles.deleteBtn}
        aria-label="Удалить заметку"
        onClick={() => onDelete(note.id)}
      >
        ✕
      </button>
    </div>
  );
});

export default NoteRow;
