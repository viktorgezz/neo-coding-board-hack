/**
 * CandidateEditorPage — /session/:id/candidate
 *
 * The candidate's complete interview environment. Three silent background
 * processes run concurrently with zero UI surface:
 *
 *   1. WebSocket (via useWebSocket): every keystroke streams to interviewer.
 *   2. Metric POSTs: paste and tab-switch events fire-and-forget to server.
 *   3. Polling (5s): watches for session FINISHED → silently navigates to /done.
 *
 * Architecture note — two-component split:
 *   CandidateEditorPage (outer)  — reads candidate token synchronously.
 *     If null, returns <Navigate> BEFORE any hooks run in the inner component.
 *     This avoids a conditional hook call while keeping the token check
 *     before any fetches, as required by the spec.
 *
 *   CandidateEditorContent (inner) — all hooks. token is guaranteed string.
 *
 * Zero imports from useAuth or AuthContext — candidate token comes exclusively
 * from getCandidateToken() in the candidateSession module.
 */

import { lazy, Suspense, memo, useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import type { OnMount, OnChange } from '@monaco-editor/react';

import { getCandidateToken } from '@/auth/candidateSession';
import { useWebSocket } from '@/hooks/useWebSocket';
import LanguageSelector from '@/components/LanguageSelector';
import InterviewTimer from '@/components/InterviewTimer';
import styles from './CandidateEditorPage.module.css';

// ---------------------------------------------------------------------------
// Monaco lazy import — defined at MODULE scope, never inside a component.
// If placed inside the component, React.lazy() would create a NEW lazy
// component on every render, remounting Monaco on every re-render.
// ---------------------------------------------------------------------------
const MonacoEditor = lazy(() => import('@monaco-editor/react'));

// Stable Suspense fallback element — dark bg matches Monaco vs-dark theme
// so there is no white/grey flash as the ~2MB bundle downloads.
const EDITOR_FALLBACK = <div className={styles.editorFallback} />;

// Monaco editor type derived from @monaco-editor/react's OnMount signature —
// avoids a direct 'monaco-editor' import while keeping full type safety.
type IStandaloneCodeEditor = Parameters<OnMount>[0];

// ── Monaco options object defined outside the component ────────────────────
// This object reference is stable — MonacoEditor will not re-apply options
// on every parent re-render.
const MONACO_OPTIONS: Parameters<typeof MonacoEditor>[0]['options'] = {
  fontSize: 15,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  wordWrap: 'on',
  padding: { top: 16 },
  overviewRulerLanes: 0,
  hideCursorInOverviewRuler: true,
  renderLineHighlight: 'none',
  contextmenu: true, // keep right-click — paste metric fires on paste event
};

// ---------------------------------------------------------------------------
// Outer wrapper — token guard
// ---------------------------------------------------------------------------

/**
 * Reads the candidate session token BEFORE any hooks run in the inner
 * component. If null (session module was never populated — direct URL
 * navigation or page refresh), redirect immediately to root.
 */
export default function CandidateEditorPage() {
  const token = getCandidateToken(); // plain module read, NOT a hook

  if (!token) {
    return <Navigate to="/" replace />;
  }

  return <CandidateEditorContent token={token} />;
}

// ---------------------------------------------------------------------------
// Inner component — all hooks, all logic
// ---------------------------------------------------------------------------

interface CandidateEditorContentProps {
  token: string; // guaranteed non-null by the outer wrapper
}

// Wrapped in memo: the outer wrapper never re-renders (it's a simple branch),
// so memo is mostly for documentation clarity here.
const CandidateEditorContent = memo(function CandidateEditorContent({
  token,
}: CandidateEditorContentProps) {
  // Default '' handles the (impossible in practice) undefined case from useParams
  const { id: idRoom = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // ── State ────────────────────────────────────────────────────────────────

  const [nameVacancy, setNameVacancy] = useState('');
  const [idLanguage,  setIdLanguage]  = useState('kotlin');
  const [initialCode, setInitialCode] = useState('');
  /**
   * Gates Monaco mount. Monaco only renders after both initial fetches resolve
   * so that `defaultValue` is correctly set on first render — Monaco ignores
   * `defaultValue` changes after mount (it is an uncontrolled prop).
   */
  const [isReady, setIsReady] = useState(false);

  // ── Refs — zero state updates from editor events ─────────────────────────

  /**
   * Captured once at component mount — used by InterviewTimer to compute
   * elapsed time. Not state: changes to elapsed time must not re-render the
   * parent.
   */
  const startTimeRef = useRef(Date.now());

  /**
   * Monaco editor instance. Never in state — putting it there would re-render
   * the component (and potentially remount Monaco) on every WS reconnect.
   */
  const editorRef = useRef<IStandaloneCodeEditor | null>(null);

  /**
   * Last textContent value — updated synchronously in onChange so sendCursor
   * always piggy-backs the current code text onto cursor publish payloads.
   * Never in state: every keystroke updating state would be catastrophically
   * expensive in a Monaco context.
   */
  const textContentRef = useRef('');

  /**
   * Cooldown flag that deduplicates the double-fire from:
   *   (a) Monaco's onDidPaste — fires for paste via editor API
   *   (b) document 'paste' event — fires for Ctrl+V and right-click paste
   * Both paths call fireMetricPaste(); without the cooldown, a single paste
   * action would POST twice.
   */
  const pasteMetricCooldownRef = useRef(false);

  // ── WebSocket hook ────────────────────────────────────────────────────────

  const { sendCode, sendCursor } = useWebSocket({
    idRoom,
    role: 'candidate',
    token,
    idLanguage,
    // idLanguage changes propagate into the hook via its own useEffect([idLanguage])
    // which updates idLanguageRef.current. The STOMP connection is not restarted.
  });

  // ── Metric callbacks ──────────────────────────────────────────────────────
  // Defined with useCallback so their references are stable for the document
  // event listener useEffect's deps array (allowing exact removeEventListener).

  const fireMetricPaste = useCallback(() => {
    // Cooldown prevents double-POST from concurrent Monaco + document events
    if (pasteMetricCooldownRef.current) return;
    pasteMetricCooldownRef.current = true;
    setTimeout(() => {
      pasteMetricCooldownRef.current = false;
    }, 500);

    // Fire-and-forget — error is silently swallowed, zero UI for metric failure
    fetch(`/api/v1/rooms/${idRoom}/metrics/increment-paste`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }, [idRoom, token]);

  const handleVisibilityChange = useCallback(() => {
    // Only POST when the tab becomes hidden (candidate switched away)
    // document.hidden is false on return — no POST fires for tab-back
    if (document.hidden) {
      fetch(`/api/v1/rooms/${idRoom}/metrics/increment-tab-switch`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
  }, [idRoom, token]);

  // ── Effect 1: Initial fetches ─────────────────────────────────────────────
  // join-info (vacancy name) + code/latest (initial editor content + language)
  // [] deps: idRoom, token are stable for the lifetime of this component instance.

  useEffect(() => {
    async function init() {
      // 1. Vacancy name — display only, non-fatal if it fails
      try {
        const res = await fetch(`/api/v1/rooms/join-info/${idRoom}`);
        if (res.ok) {
          const data = await res.json() as { nameVacancy?: string };
          setNameVacancy(data.nameVacancy ?? '');
        }
      } catch {
        // Non-fatal — header will just show an empty vacancy name
      }

      // 2. Latest code snapshot — initialises editor defaultValue and language
      try {
        const res = await fetch(`/api/v1/rooms/${idRoom}/code/latest`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json() as { textContent?: string; idLanguage?: string };
          setInitialCode(data.textContent ?? '');
          if (data.idLanguage) setIdLanguage(data.idLanguage);
        }
        // On 404 or other error: initialCode stays '', idLanguage stays 'kotlin'
      } catch {
        // Non-fatal — empty editor is a valid starting state
      }

      // Gate open — Monaco mounts now with the correct defaultValue + language
      setIsReady(true);
    }

    void init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Effect 2: Session-end polling (5 s interval) ──────────────────────────
  // Watches for status === 'FINISHED' and silently navigates to the done screen.
  // idRoom is stable — effect runs exactly once despite [idRoom, token, navigate].

  useEffect(() => {
    const intervalId = setInterval(async () => {
      try {
        const res = await fetch(`/api/v1/rooms/join-info/${idRoom}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return; // non-fatal, keep polling

        const data = await res.json() as { status?: string };
        if (data.status === 'FINISHED') {
          clearInterval(intervalId);
          navigate(`/session/${idRoom}/done`, { replace: true });
        }
      } catch {
        // Network blip — keep polling silently
      }
    }, 5000);

    return () => clearInterval(intervalId);
  }, [idRoom, token, navigate]);

  // ── Effect 3: Document event listeners ────────────────────────────────────
  // fireMetricPaste and handleVisibilityChange are stable (useCallback with
  // stable [idRoom, token] deps), so this effect runs exactly once.

  useEffect(() => {
    document.addEventListener('paste', fireMetricPaste);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('paste', fireMetricPaste);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fireMetricPaste, handleVisibilityChange]);

  // ── Stable Monaco event handlers ─────────────────────────────────────────
  // These are passed as props to MonacoEditor. Stable refs prevent unnecessary
  // Monaco re-initialization when parent re-renders (e.g., language change).

  const handleEditorMount = useCallback<OnMount>((editor, _monaco) => {
    editorRef.current = editor;

    // Cursor position → sendCursor (immediate, no debounce in hook)
    editor.onDidChangeCursorPosition((e) => {
      sendCursor(e.position.lineNumber, e.position.column);
    });

    // Monaco paste event — works for paste via editor command/keyboard
    // document 'paste' event (registered above) catches Ctrl+V and right-click
    // Both paths flow through fireMetricPaste() which deduplicates via cooldown
    editor.onDidPaste(() => {
      fireMetricPaste();
    });
  }, [sendCursor, fireMetricPaste]);

  const handleEditorChange = useCallback<OnChange>((value, _ev) => {
    const text = value ?? '';
    // Update textContentRef synchronously so sendCursor always piggy-backs
    // the current code onto immediate cursor payloads (no stale text)
    textContentRef.current = text;
    // sendCode debounces internally — rapid typing → one WS publish per 300ms idle
    sendCode(text);
  }, [sendCode]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={styles.candidateRoot}>

      {/* ── Header: 48px bar — vacancy name, language picker, timer ── */}
      <header className={styles.editorHeader}>
        <span className={styles.vacancyName}>{nameVacancy}</span>
        <LanguageSelector value={idLanguage} onChange={setIdLanguage} />
        <InterviewTimer startTime={startTimeRef.current} />
      </header>

      {/* ── Editor wrapper — fills all remaining height ── */}
      <div className={styles.editorWrapper}>
        {!isReady ? (
          // Initial fetch pending — show the dark bg so there is no white flash.
          // This same background is used by the Suspense fallback below.
          EDITOR_FALLBACK
        ) : (
          <Suspense fallback={EDITOR_FALLBACK}>
            <MonacoEditor
              height="100%"
              language={idLanguage}
              defaultValue={initialCode}
              theme="vs-dark"
              options={MONACO_OPTIONS}
              onMount={handleEditorMount}
              onChange={handleEditorChange}
            />
          </Suspense>
        )}
      </div>

    </div>
  );
});
