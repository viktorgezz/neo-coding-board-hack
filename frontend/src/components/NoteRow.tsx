/**
 * NoteRow — single timestamped note in the interviewer notes panel.
 *
 * Delete button is invisible by default and revealed on hover via CSS
 * (.noteRow:hover .deleteBtn). Optional edit: pencil toggles inline input + Save.
 *
 * Memoized: re-renders when note.id, note.textContent, onDelete, or onUpdate changes.
 */

import { memo, useState, useEffect, type KeyboardEvent } from 'react';
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
  /** When set, shows an edit control that PATCHes via the parent. */
  onUpdate?: (idNote: string, textContent: string) => Promise<boolean>;
}

const NoteRow = memo(function NoteRow({ note, onDelete, onUpdate }: NoteRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft,     setDraft]     = useState(note.textContent);
  const [isSaving,  setIsSaving]  = useState(false);

  useEffect(() => {
    setDraft(note.textContent);
  }, [note.textContent, note.id]);

  async function saveEdit() {
    if (!onUpdate || isSaving) return;
    setIsSaving(true);
    const ok = await onUpdate(note.id, draft);
    setIsSaving(false);
    if (ok) setIsEditing(false);
  }

  function cancelEdit() {
    setDraft(note.textContent);
    setIsEditing(false);
  }

  function handleEditKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      void saveEdit();
    }
    if (e.key === 'Escape') cancelEdit();
  }

  return (
    <div className={styles.noteRow} data-editing={isEditing}>
      <span className={styles.noteTime}>{note.timeOffset}</span>
      {isEditing ? (
        <input
          type="text"
          className={styles.noteEditInput}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleEditKeyDown}
          disabled={isSaving}
          aria-label="Текст заметки"
        />
      ) : (
        <span className={styles.noteText}>{note.textContent}</span>
      )}
      <div className={styles.rowActions}>
        {onUpdate && !isEditing && (
          <button
            type="button"
            className={styles.editBtn}
            aria-label="Изменить заметку"
            onClick={() => setIsEditing(true)}
          >
            ✎
          </button>
        )}
        {isEditing && (
          <>
            <button
              type="button"
              className={styles.editBtn}
              aria-label="Сохранить"
              disabled={isSaving}
              onClick={() => void saveEdit()}
            >
              ✓
            </button>
            <button
              type="button"
              className={styles.editBtn}
              aria-label="Отмена"
              disabled={isSaving}
              onClick={cancelEdit}
            >
              ↩
            </button>
          </>
        )}
        <button
          type="button"
          className={styles.deleteBtn}
          aria-label="Удалить заметку"
          onClick={() => onDelete(note.id)}
        >
          ✕
        </button>
      </div>
    </div>
  );
});

export default NoteRow;
