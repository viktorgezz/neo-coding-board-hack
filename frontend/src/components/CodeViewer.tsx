/**
 * CodeViewer — Monaco workspace for interviewer room.
 *
 * Three concurrent concerns, all isolated to this component:
 *
 *   1. WS subscription (useWebSocket, role='interviewer')
 *      liveCode  → editor.setValue() imperatively (no React re-render)
 *      liveCursor → deltaDecorations() — purple left-border at candidate pos
 *
 *   2. Initial code snapshot (GET /code/latest on mount)
 *      Sets initial editor content + language BEFORE the first WS message.
 *      Handles two race conditions:
 *        (a) fetch resolves before Monaco mounts → stored in refs, applied in onMount
 *        (b) Monaco mounts before fetch resolves → applied directly via editorRef
 *
 *   3. Status indicator (top-right dot)
 *      isConnected → green "Live" | disconnected → red "Отключён"
 *      error       → 32px banner above Monaco + onError() callback to parent
 *
 * DO NOT use Monaco's `value` prop — every candidate keystroke would cause
 * a React re-render and reconciliation. Use editor.setValue() imperatively.
 */

import { lazy, Suspense, useEffect, useRef, useCallback, useState } from 'react';
import type { OnMount } from '@monaco-editor/react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useCursorSocket } from '@/hooks/useCursorSocket';
import LanguageSelector from './LanguageSelector';
import styles from './CodeViewer.module.css';

// Module-scope lazy import — must NOT be inside the component.
const MonacoEditor = lazy(() => import('@monaco-editor/react'));

// Types derived from OnMount to avoid a direct 'monaco-editor' import.
type IStandaloneCodeEditor = Parameters<OnMount>[0];
type Monaco                = Parameters<OnMount>[1];

// Stable Monaco options — defined at module scope so the object reference
// never changes between renders, preventing Monaco option re-application.
const MONACO_OPTIONS: Parameters<typeof MonacoEditor>[0]['options'] = {
  readOnly:             false,
  domReadOnly:          false,
  fontSize:             15,
  minimap:              { enabled: false },
  scrollBeyondLastLine: false,
  wordWrap:             'on',
  padding:              { top: 16 },
  renderLineHighlight:  'none',
  overviewRulerLanes:   0,
  cursorStyle:          'line',
  cursorBlinking:       'solid',
};

const EDITOR_FALLBACK = <div className={styles.editorFallback} />;

export interface CodeViewerProps {
  idRoom:    string;
  token:     string;
  onConnect: () => void;
  onError:   (msg: string) => void;
}

export default function CodeViewer({
  idRoom,
  token,
  onConnect,
  onError,
}: CodeViewerProps) {
  const [language, setLanguage] = useState('plaintext');
  // ── Refs ────────────────────────────────────────────────────────────────

  const editorRef       = useRef<IStandaloneCodeEditor | null>(null);
  /** Monaco instance — stored in onMount so fetchInitialCode can call setModelLanguage. */
  const monacoRef       = useRef<Monaco | null>(null);
  /** Previous decoration IDs — must be passed to deltaDecorations for cleanup. */
  const decorationsRef  = useRef<string[]>([]);
  /** Pre-fetched initial code — applied in onMount if editor not yet mounted. */
  const initialCodeRef  = useRef<string | null>(null);
  /** Pre-fetched initial language. */
  const initialLangRef  = useRef<string | null>(null);

  // ── WebSocket (interviewer mode — subscribe only, no publish) ─────────

  const { liveCode, liveCursor, isConnected, error } = useWebSocket({
    idRoom,
    role:  'interviewer',
    token,
  });
  const {
    isConnected: isCursorConnected,
    error: cursorError,
    cursorFromCandidate,
    sendCursorPosition,
  } = useCursorSocket({
    interviewId: idRoom,
    role: 'interviewer',
  });

  // ── Notify parent of connection events ────────────────────────────────

  useEffect(() => {
    if (isConnected) onConnect();
  }, [isConnected, onConnect]);

  useEffect(() => {
    if (error) onError(error);
  }, [error, onError]);

  // ── Initial code snapshot (mount, runs once) ──────────────────────────
  // The WS hook also fetches code/latest in handleConnect(), but that only
  // exposes textContent. This separate fetch also captures idLanguage so we
  // can set Monaco's language mode on first render.

  useEffect(() => {
    async function fetchInitialCode() {
      try {
        const res = await fetch(`/api/v1/rooms/${idRoom}/code/latest`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json() as { textContent?: string; idLanguage?: string };
        const code = data.textContent ?? '';
        const lang = data.idLanguage   ?? 'plaintext';

        // Store for onMount in case editor hasn't mounted yet
        initialCodeRef.current = code;
        initialLangRef.current = lang;
        setLanguage(lang);

        // Apply immediately if editor is already mounted
        if (editorRef.current) {
          editorRef.current.setValue(code);
          const model = editorRef.current.getModel();
          if (model && monacoRef.current) {
            monacoRef.current.editor.setModelLanguage(model, lang);
          }
        }
      } catch {
        // Non-fatal — WS stream will populate content as candidate types
      }
    }
    void fetchInitialCode();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── liveCode → editor.setValue() ─────────────────────────────────────
  // Imperative update bypasses React reconciliation — critical for typing latency.

  useEffect(() => {
    if (liveCode !== null && editorRef.current) {
      editorRef.current.setValue(liveCode.textContent);
    }
  }, [liveCode]);

  // ── liveCursor → deltaDecorations (candidate cursor decoration) ────────

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const sourceCursor = cursorFromCandidate
      ? { cursorLine: cursorFromCandidate.line, cursorCh: cursorFromCandidate.column }
      : liveCursor;
    if (!sourceCursor) return;

    // deltaDecorations: clear previous IDs, apply new decoration.
    // 'candidate-cursor-decoration' is a :global() CSS class in CodeViewer.module.css
    // that adds border-left: 2px solid #7c3aed at the candidate's cursor column.
    const newIds = editor.deltaDecorations(decorationsRef.current, [
      {
        range: {
          startLineNumber: sourceCursor.cursorLine,
          startColumn:     sourceCursor.cursorCh,
          endLineNumber:   sourceCursor.cursorLine,
          endColumn:       sourceCursor.cursorCh,
        },
        options: {
          className: 'candidate-cursor-decoration',
        },
      },
    ]);
    decorationsRef.current = newIds;
  }, [liveCursor, cursorFromCandidate]);

  // ── onMount: store editor ref, apply pre-fetched initial code ─────────

  const handleEditorMount = useCallback<OnMount>((editor, monaco) => {
    editorRef.current   = editor;
    monacoRef.current   = monaco;

    editor.onDidChangeCursorPosition((e) => {
      sendCursorPosition(e.position.lineNumber, e.position.column);
    });

    // Apply initial code if the fetch already resolved before Monaco mounted
    if (initialCodeRef.current !== null) {
      editor.setValue(initialCodeRef.current);
    }
    if (initialLangRef.current !== null) {
      const model = editor.getModel();
      if (model) monaco.editor.setModelLanguage(model, initialLangRef.current);
    }
  }, [sendCursorPosition]); // stable — only called once by Monaco on first mount

  const handleLanguageChange = useCallback((lang: string) => {
    setLanguage(lang);
    const model = editorRef.current?.getModel();
    if (model && monacoRef.current) {
      monacoRef.current.editor.setModelLanguage(model, lang);
    }
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className={styles.codeViewerRoot}>

      {/* Status dot — top right of header */}
      <div className={styles.viewerHeader}>
        <div className={styles.statusBlock}>
          <span
            className={`${styles.statusDot} ${
            isConnected || isCursorConnected ? styles.statusDotConnected : styles.statusDotDisconnected
            }`}
          />
          <span
            className={`${styles.statusLabel} ${
              isConnected || isCursorConnected ? styles.statusLabelConnected : styles.statusLabelDisconnected
            }`}
          >
            {isConnected || isCursorConnected ? 'Live' : 'Отключён'}
          </span>
        </div>
        <LanguageSelector value={language} onChange={handleLanguageChange} />
      </div>

      {/* WS error banner — rendered above Monaco when connection is lost */}
      {(error !== null || cursorError !== null) && (
        <div className={styles.errorBanner} role="alert">
          Соединение потеряно. Проверьте каналы code/cursor.
        </div>
      )}

      {/* Monaco — read-only, fills remaining height */}
      <div className={styles.editorWrapper}>
        <Suspense fallback={EDITOR_FALLBACK}>
          <MonacoEditor
            height="100%"
            theme="vs-dark"
            defaultLanguage="plaintext"
            defaultValue=""
            options={MONACO_OPTIONS}
            onMount={handleEditorMount}
          />
        </Suspense>
      </div>

    </div>
  );
}
