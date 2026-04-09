/**
 * CodeViewer — Monaco editor for the interviewer room.
 *
 * Three concurrent concerns:
 *
 *   1. WS subscription (useWebSocket, role='interviewer')
 *      liveCode   → editor.setValue() imperatively (echo-suppressed)
 *      liveCursor → deltaDecorations() — candidate cursor decoration
 *
 *   2. Initial code snapshot (GET /code/latest on mount)
 *      Sets editor content + language before the first WS message.
 *      Handles the race between fetch and Monaco mount via refs.
 *
 *   3. Error banner — shown inside the editor area when WS is lost.
 *
 * Interviewer edits:
 *   The editor is NOT read-only. When the interviewer types, onChange →
 *   sendCode() → debounced STOMP publish. The echo (same content coming
 *   back via liveCode) is suppressed by comparing current editor content
 *   before calling setValue(), preventing cursor-position resets.
 *
 * Language and cursor-visibility state are controlled by the parent
 * (InterviewerRoomPage) and passed as props so the page-level header
 * can render the language selector and cursor toggle.
 */

import { lazy, Suspense, useEffect, useRef, useCallback } from 'react';
import type { OnMount, OnChange, BeforeMount } from '@monaco-editor/react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useCursorSocket } from '@/hooks/useCursorSocket';
import { defineNeoTheme, NEO_THEME_NAME } from '@/styles/monacoTheme';
import styles from './CodeViewer.module.css';

const MonacoEditor = lazy(() => import('@monaco-editor/react'));

type IStandaloneCodeEditor = Parameters<OnMount>[0];
type Monaco                = Parameters<OnMount>[1];

const handleBeforeMount: BeforeMount = (monaco) => {
  defineNeoTheme(monaco);
};

const MONACO_OPTIONS: Parameters<typeof MonacoEditor>[0]['options'] = {
  fontSize:             15,
  minimap:              { enabled: false },
  scrollBeyondLastLine: false,
  wordWrap:             'on',
  padding:              { top: 16 },
  renderLineHighlight:  'none',
  overviewRulerLanes:   0,
  cursorStyle:          'line',
  cursorBlinking:       'blink',
};

const EDITOR_FALLBACK = <div className={styles.editorFallback} />;

export interface CodeViewerProps {
  idRoom:           string;
  token:            string;
  /** Controlled by parent — drives Monaco language mode. */
  language:         string;
  onLanguageChange: (lang: string) => void;
  /** Controlled by parent — gates sendCursorPosition calls. */
  showCursor:       boolean;
  onConnect:        () => void;
  onError:          (msg: string) => void;
}

export default function CodeViewer({
  idRoom,
  token,
  language,
  onLanguageChange,
  showCursor,
  onConnect,
  onError,
}: CodeViewerProps) {

  // ── Refs ──────────────────────────────────────────────────────────────

  const editorRef      = useRef<IStandaloneCodeEditor | null>(null);
  const monacoRef      = useRef<Monaco | null>(null);
  const decorationsRef = useRef<string[]>([]);
  const initialCodeRef = useRef<string | null>(null);
  const initialLangRef = useRef<string | null>(null);
  /**
   * Always holds the latest liveCode.textContent.
   * Written before calling setValue() so handleEditorMount can apply the
   * correct value even when Monaco mounts after the first liveCode update.
   */
  const liveCodeRef    = useRef<string | null>(null);
  /**
   * Mirrors the showCursor prop inside the stable handleEditorMount callback.
   * Using a ref avoids re-registering the Monaco cursor listener on every toggle.
   */
  const showCursorRef  = useRef(showCursor);

  useEffect(() => {
    showCursorRef.current = showCursor;
  }, [showCursor]);

  /** Tracks previous showCursor value to detect true→false transitions. */
  const prevShowCursorRef = useRef(showCursor);

  // ── WebSocket ─────────────────────────────────────────────────────────

  const { liveCode, liveCursor, isConnected, error, sendCode } = useWebSocket({
    idRoom,
    role:       'interviewer',
    token,
    idLanguage: language, // keep hook's idLanguageRef in sync with parent language
  });
  const {
    error:              cursorError,
    cursorFromCandidate,
    sendCursorPosition,
    sendCursorHide,
  } = useCursorSocket({
    interviewId: idRoom,
    role: 'interviewer',
  });

  // ── Notify parent of connection events ────────────────────────────────

  useEffect(() => { if (isConnected) onConnect(); }, [isConnected, onConnect]);
  useEffect(() => { if (error)       onError(error); }, [error, onError]);

  // ── Cursor hide signal — fires when showCursor transitions true→false ─

  useEffect(() => {
    const prev = prevShowCursorRef.current;
    prevShowCursorRef.current = showCursor;
    if (prev && !showCursor) {
      sendCursorHide();
    }
  }, [showCursor, sendCursorHide]);

  // ── Initial code snapshot ─────────────────────────────────────────────

  useEffect(() => {
    async function fetchInitialCode() {
      try {
        const res = await fetch(`/api/v1/rooms/${idRoom}/code/latest`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        // Real API: { textCode, language }  Mock API: { textContent, idLanguage }
        const data = await res.json() as {
          textContent?: string; textCode?: string;
          idLanguage?: string; language?: string;
        };
        const code = data.textContent ?? data.textCode ?? '';
        const lang = data.idLanguage  ?? data.language  ?? 'plaintext';

        initialCodeRef.current = code;
        initialLangRef.current = lang;
        onLanguageChange(lang);

        if (editorRef.current) {
          editorRef.current.setValue(code);
          const model = editorRef.current.getModel();
          if (model && monacoRef.current) {
            monacoRef.current.editor.setModelLanguage(model, lang);
          }
        }
      } catch {
        // Non-fatal — WS stream will populate content
      }
    }
    void fetchInitialCode();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── liveCode → setValue() ─────────────────────────────────────────────
  // Echo suppression: if the content arriving from STOMP is identical to
  // what's already in the editor (our own edit echoed back), skip setValue.
  // This prevents the cursor position from being reset when the interviewer
  // is actively typing.

  useEffect(() => {
    if (liveCode === null) return;
    liveCodeRef.current = liveCode.textContent;
    const editor = editorRef.current;
    if (!editor) return;
    if (editor.getValue() === liveCode.textContent) return; // suppress own echo
    editor.setValue(liveCode.textContent);
  }, [liveCode]);

  // ── liveCursor → deltaDecorations ────────────────────────────────────

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const sourceCursor = cursorFromCandidate
      ? { cursorLine: cursorFromCandidate.line, cursorCh: cursorFromCandidate.column }
      : liveCursor;
    if (!sourceCursor) return;

    const newIds = editor.deltaDecorations(decorationsRef.current, [
      {
        range: {
          startLineNumber: sourceCursor.cursorLine,
          startColumn:     sourceCursor.cursorCh,
          endLineNumber:   sourceCursor.cursorLine,
          endColumn:       sourceCursor.cursorCh,
        },
        options: { className: 'candidate-cursor-decoration' },
      },
    ]);
    decorationsRef.current = newIds;
  }, [liveCursor, cursorFromCandidate]);

  // ── language prop → setModelLanguage ─────────────────────────────────

  useEffect(() => {
    const model = editorRef.current?.getModel();
    if (model && monacoRef.current) {
      monacoRef.current.editor.setModelLanguage(model, language);
    }
  }, [language]);

  // ── onChange — interviewer edits ──────────────────────────────────────

  const handleEditorChange = useCallback<OnChange>((value) => {
    sendCode(value ?? '');
  }, [sendCode]);

  // ── onMount ───────────────────────────────────────────────────────────

  const handleEditorMount = useCallback<OnMount>((editor, monaco) => {
    editorRef.current  = editor;
    monacoRef.current  = monaco;

    // Use onDidChangeCursorSelection to capture both cursor moves and selections.
    editor.onDidChangeCursorSelection((e) => {
      if (!showCursorRef.current) return;
      const sel = e.selection;
      if (sel.isEmpty()) {
        // Plain cursor move — no selection
        sendCursorPosition(sel.positionLineNumber, sel.positionColumn);
      } else {
        // Interviewer has a text range selected — send selection bounds too
        sendCursorPosition(sel.positionLineNumber, sel.positionColumn, {
          selStartLine: sel.startLineNumber,
          selStartCol:  sel.startColumn,
          selEndLine:   sel.endLineNumber,
          selEndCol:    sel.endColumn,
        });
      }
    });

    // Apply the best available snapshot — liveCodeRef preferred over initialCodeRef
    const code = liveCodeRef.current ?? initialCodeRef.current;
    if (code !== null) editor.setValue(code);

    if (initialLangRef.current !== null) {
      const model = editor.getModel();
      if (model) monaco.editor.setModelLanguage(model, initialLangRef.current);
    }
  }, [sendCursorPosition]); // stable — registered once on Monaco first mount

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className={styles.codeViewerRoot}>

      {/* Error banner — inside the editor area, not in the page header */}
      {(error !== null || cursorError !== null) && (
        <div className={styles.errorBanner} role="alert">
          Соединение потеряно. Проверьте каналы code/cursor.
        </div>
      )}

      <div className={styles.editorWrapper}>
        <Suspense fallback={EDITOR_FALLBACK}>
          <MonacoEditor
            height="100%"
            defaultLanguage="plaintext"
            defaultValue=""
            theme={NEO_THEME_NAME}
            beforeMount={handleBeforeMount}
            options={MONACO_OPTIONS}
            onMount={handleEditorMount}
            onChange={handleEditorChange}
          />
        </Suspense>
      </div>

    </div>
  );
}
