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

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type KeyboardEvent,
} from 'react';
import { getTasksBankApiRoot } from '@/api/tasksBankClient';
import NoteRow from './NoteRow';
import type { NoteResponse } from './NoteRow';
import styles from './NotesPanel.module.css';

function normalizeNote(raw: unknown): NoteResponse | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (o.id === undefined || o.id === null) return null;
  return {
    id:          String(o.id),
    textContent: typeof o.textContent === 'string' ? o.textContent : '',
    timeOffset:  typeof o.timeOffset === 'string' ? o.timeOffset : '',
    timeCreated: typeof o.timeCreated === 'string' ? o.timeCreated : '',
  };
}

/** Spring paged `content` or OpenAPI `NoteListResponse.listNotes`. */
function parseNotesPayload(data: unknown): NoteResponse[] {
  if (!data || typeof data !== 'object') return [];
  const o = data as Record<string, unknown>;
  const rawList =
    Array.isArray(o.content) ? o.content
    : Array.isArray(o.listNotes) ? o.listNotes
    : [];
  return rawList
    .map(normalizeNote)
    .filter((n): n is NoteResponse => n !== null);
}

type DifficultyLevel = 'easy' | 'medium' | 'hard';

interface CategoryRead {
  id:   number;
  name: string;
}

interface TaskRead {
  id:          number;
  title:       string;
  statement:   string;
  difficulty:  DifficultyLevel;
  category_id: number;
}

const TASKS_BANK_BASE_URL = getTasksBankApiRoot();

export interface NotesPanelProps {
  idRoom:   string;
  token:    string;
  onFinish: () => void; // opens VerdictModal
}

export default function NotesPanel({
  idRoom,
  token,
  onFinish,
}: NotesPanelProps) {
  const [notes,              setNotes]              = useState<NoteResponse[]>([]);
  const [noteInput,          setNoteInput]          = useState('');
  const [isSubmittingNote,   setIsSubmittingNote]   = useState(false);
  const [taskCategories,     setTaskCategories]     = useState<CategoryRead[]>([]);
  const [tasks,              setTasks]              = useState<TaskRead[]>([]);
  const [tasksLoading,       setTasksLoading]       = useState(false);
  const [tasksError,         setTasksError]         = useState<string | null>(null);
  const [selectedCategory,   setSelectedCategory]   = useState<number | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel | null>(null);
  const [taskSearchQuery, setTaskSearchQuery]       = useState('');
  const inputRef     = useRef<HTMLInputElement | null>(null);
  const notesListRef = useRef<HTMLDivElement | null>(null);

  const filteredTasks = useMemo(() => {
    const q = taskSearchQuery.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q)
        || (t.statement && t.statement.toLowerCase().includes(q)),
    );
  }, [tasks, taskSearchQuery]);

  // ── Mount: fetch existing notes ────────────────────────────────────────

  useEffect(() => {
    async function fetchNotes() {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        let res = await fetch(
          `/api/v1/rooms/${idRoom}/notes/paged?page=0&size=50`,
          { headers },
        );
        if (res.ok) {
          setNotes(parseNotesPayload(await res.json()));
          return;
        }
        res = await fetch(`/api/v1/rooms/${idRoom}/notes`, { headers });
        if (res.ok) setNotes(parseNotesPayload(await res.json()));
      } catch {
        // Non-fatal — notes panel degrades gracefully to empty list
      }
    }
    void fetchNotes();
  }, [idRoom, token]);

  // ── Task bank: fetch categories (once on mount) ────────────────────────

  useEffect(() => {
    async function fetchTaskCategories() {
      try {
        const res = await fetch(`${TASKS_BANK_BASE_URL}/api/v1/categories`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json() as CategoryRead[];
        setTaskCategories(data);
      } catch {
        // non-fatal
      }
    }
    void fetchTaskCategories();
  }, [token]);

  // ── Task bank: fetch tasks when filters change ─────────────────────────

  useEffect(() => {
    async function fetchTasks() {
      setTasksLoading(true);
      setTasksError(null);
      try {
        const params = new URLSearchParams();
        if (selectedCategory   !== null) params.set('category_id', String(selectedCategory));
        if (selectedDifficulty !== null) params.set('difficulty',   selectedDifficulty);
        const query = params.toString();
        const url   = `${TASKS_BANK_BASE_URL}/api/v1/tasks${query ? `?${query}` : ''}`;
        const res   = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json() as TaskRead[];
        setTasks(data);
      } catch {
        setTasksError('Не удалось загрузить задачи');
      } finally {
        setTasksLoading(false);
      }
    }
    void fetchTasks();
  }, [selectedCategory, selectedDifficulty, token]);

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
        const n = normalizeNote(await res.json());
        if (n) {
          setNotes((prev) => [...prev, n]);
        }
        // Scroll to bottom after React re-renders the new row
        requestAnimationFrame(() => {
          const list = notesListRef.current;
          if (list) list.scrollTop = list.scrollHeight;
        });
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

  const handleUpdateNote = useCallback(
    async (idNote: string, textContent: string): Promise<boolean> => {
      const trimmed = textContent.trim();
      if (!trimmed) return false;
      try {
        const res = await fetch(`/api/v1/rooms/${idRoom}/notes/${idNote}`, {
          method:  'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization:  `Bearer ${token}`,
          },
          body: JSON.stringify({ textContent: trimmed }),
        });
        if (!res.ok) return false;
        const n = normalizeNote(await res.json());
        if (!n) return false;
        setNotes((prev) => prev.map((x) => (x.id === idNote ? n : x)));
        return true;
      } catch {
        return false;
      }
    },
    [idRoom, token],
  );

  // ── Keyboard handler ───────────────────────────────────────────────────

  function handleNoteKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleAddNote();
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className={styles.notesPanel}>

      {/* ── 1. БАНК ЗАДАЧ (верхняя половина панели, свой скролл) ───── */}
      <div className={styles.taskBank}>
        <div className={styles.sectionTitle}>Банк задач</div>

        <div className={styles.taskFilters}>
          <select
            className={styles.taskFilter}
            value={selectedCategory ?? ''}
            onChange={(e) => {
              const v = e.target.value;
              setSelectedCategory(v ? Number(v) : null);
            }}
          >
            <option value="">Все категории</option>
            {taskCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>

          <select
            className={styles.taskFilter}
            value={selectedDifficulty ?? ''}
            onChange={(e) => {
              const v = e.target.value as DifficultyLevel | '';
              setSelectedDifficulty(v || null);
            }}
          >
            <option value="">Любая сложность</option>
            <option value="easy">Лёгкая</option>
            <option value="medium">Средняя</option>
            <option value="hard">Сложная</option>
          </select>
        </div>

        <input
          type="search"
          className={styles.taskSearch}
          placeholder="Поиск задач…"
          value={taskSearchQuery}
          onChange={(e) => setTaskSearchQuery(e.target.value)}
          aria-label="Поиск задач"
        />

        <div className={styles.taskListScroll}>
          <div className={styles.taskList}>
            {tasksLoading && (
              <span className={styles.taskPlaceholder}>Загрузка...</span>
            )}
            {!tasksLoading && tasksError && (
              <span className={styles.taskPlaceholder}>Задачи не загружены</span>
            )}
            {!tasksLoading && !tasksError && tasks.length === 0 && (
              <span className={styles.taskPlaceholder}>Задачи не загружены</span>
            )}
            {!tasksLoading && !tasksError && tasks.length > 0 && filteredTasks.length === 0 && (
              <span className={styles.taskPlaceholder}>Ничего не найдено</span>
            )}
            {!tasksLoading && !tasksError && filteredTasks.map((task) => (
              <div key={task.id} className={styles.taskItem}>
                <div className={styles.taskTitleRow}>
                  <span className={styles.taskTitle}>{task.title}</span>
                  <span className={styles.taskBadge}>{task.difficulty}</span>
                </div>
                {task.statement && (
                  <div className={styles.taskStatement}>{task.statement}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 2. ЗАМЕТКИ (takes remaining space, title + scrollable list) ── */}
      <div className={styles.notesSection}>
        <div className={styles.notesSectionTitle}>Заметки</div>

        <div ref={notesListRef} className={styles.notesList}>
          {notes.length === 0 ? (
            <p className={styles.emptyNotes}>Нет заметок</p>
          ) : (
            notes.map((note) => (
              <NoteRow
                key={note.id}
                note={note}
                onDelete={handleDeleteNote}
                onUpdate={handleUpdateNote}
              />
            ))
          )}
        </div>
      </div>

      {/* ── 3. Input + finish button (pinned at bottom) ─────────────── */}
      <div className={styles.noteInputArea}>
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
          className={styles.finishBtn}
          onClick={onFinish}
        >
          Завершить интервью
        </button>
      </div>

    </div>
  );
}
