/**
 * NotesPanel — interviewer's private notes workspace during a live session.
 *
 * Notes are fetched on mount and after each successful POST (not polled).
 * Add: input clears immediately before the POST resolves (optimistic clear).
 * Delete: row removed immediately (optimistic delete, never restored on error).
 *
 * NoteRow is memoized — re-renders only when note.id or onDelete changes.
 * handleDeleteNote is useCallback([idRoom, token]) — stable reference ensures
 * NoteRow memo is effective even when noteInput state changes on every keystroke.
 */

import { useState, useEffect, useRef, useCallback, type KeyboardEvent } from 'react';
import NoteRow from './NoteRow';
import type { NoteResponse } from './NoteRow';
import InterviewTimer from './InterviewTimer';
import styles from './NotesPanel.module.css';

interface NoteListPage {
  content: NoteResponse[];
}

export interface NotesPanelProps {
  idRoom:    string;
  token:     string;
  startTime: number;    // Date.now() at room mount — for InterviewTimer
  onFinish:  () => void; // opens VerdictModal
}

export default function NotesPanel({
  idRoom,
  token,
  startTime,
  onFinish,
}: NotesPanelProps) {
  const [notes,            setNotes]            = useState<NoteResponse[]>([]);
  const [noteInput,        setNoteInput]        = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // ── Mount: fetch existing notes ────────────────────────────────────────

  useEffect(() => {
    async function fetchNotes() {
      try {
        const res = await fetch(
          `/api/v1/rooms/${idRoom}/notes/paged?page=0&size=50`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (res.ok) {
          const data = await res.json() as NoteListPage;
          setNotes(data.content);
        }
      } catch {
        // Non-fatal — notes panel degrades gracefully to empty list
      }
    }
    void fetchNotes();
  }, [idRoom]); // eslint-disable-line react-hooks/exhaustive-deps
  // token is stable for session lifetime; idRoom identifies the resource

  // ── Add note ───────────────────────────────────────────────────────────

  const handleAddNote = useCallback(async () => {
    const trimmed = noteInput.trim();
    if (!trimmed || isSubmittingNote) return;

    // Clear input immediately — do not wait for POST to resolve.
    // This gives instant feedback and allows the interviewer to type the next note.
    setNoteInput('');
    setIsSubmittingNote(true);

    try {
      const res = await fetch(`/api/v1/rooms/${idRoom}/notes`, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${token}`,
        },
        body: JSON.stringify({ textContent: trimmed }),
      });
      if (res.ok) {
        const note = await res.json() as NoteResponse;
        // Prepend — newest note appears at the top of the list
        setNotes((prev) => [note, ...prev]);
      }
      // Silently discard on non-ok — live interview, avoid UI distraction
    } catch {
      // Network error — silently discard
    } finally {
      setIsSubmittingNote(false);
      // Return focus to input so the interviewer can type without clicking
      inputRef.current?.focus();
    }
  }, [noteInput, idRoom, token]); // eslint-disable-line react-hooks/exhaustive-deps
  // isSubmittingNote intentionally omitted — checked via closure before setState

  // ── Delete note (optimistic) ───────────────────────────────────────────

  const handleDeleteNote = useCallback(async (idNote: string) => {
    // Remove immediately — no undo during a live session
    setNotes((prev) => prev.filter((n) => n.id !== idNote));
    try {
      await fetch(`/api/v1/rooms/${idRoom}/notes/${idNote}`, {
        method:  'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // Silent — optimistic delete is final
    }
  }, [idRoom, token]);

  // ── Keyboard handler ───────────────────────────────────────────────────

  function handleNoteKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleAddNote();
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────

  const canAdd = noteInput.trim().length > 0 && !isSubmittingNote;

  return (
    <div className={styles.notesPanel}>

      {/* Header: label + timer */}
      <div className={styles.notesPanelHeader}>
        <span className={styles.notesLabel}>Заметки</span>
        <InterviewTimer startTime={startTime} />
      </div>

      {/* Notes list */}
      <div className={styles.notesList}>
        {notes.length === 0 ? (
          <p className={styles.emptyNotes}>Нет заметок</p>
        ) : (
          notes.map((note) => (
            <NoteRow
              key={note.id}
              note={note}
              onDelete={handleDeleteNote}
            />
          ))
        )}
      </div>

      {/* Note input + finish button */}
      <div className={styles.noteInputArea}>
        <div className={styles.inputRow}>
          <input
            ref={inputRef}
            type="text"
            className={styles.noteInput}
            placeholder="Заметка… (Enter для сохранения)"
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            onKeyDown={handleNoteKeyDown}
          />
          <button
            type="button"
            className={styles.addNoteBtn}
            disabled={!canAdd}
            aria-label="Добавить заметку"
            onClick={() => { void handleAddNote(); }}
          >
            +
          </button>
        </div>

        <button
          type="button"
          className={styles.finishBtn}
          onClick={onFinish}
        >
          Завершить интервью
        </button>
      </div>

    </div>
  );
}
