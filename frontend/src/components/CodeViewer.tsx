/**
 * CodeViewer — Monaco editor for the interviewer room.
 *
 * WSCodeService delivers full-document snapshots; we apply them with
 * executeEdits + offset-mapped caret, suppress outbound echo until Monaco
 * finishes emitting content events, and throttle remote cursor sends to rAF.
 */

import { lazy, Suspense, useEffect, useRef, useCallback, useState, useMemo } from 'react';
import type { OnMount, OnChange, BeforeMount } from '@monaco-editor/react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useCursorSocket, type CursorSelectionData } from '@/hooks/useCursorSocket';
import { useRoomCodeSync } from '@/hooks/useRoomCodeSync';
import { applyRemoteMonacoDocument, runRemoteDocumentApply } from '@/utils/applyRemoteMonacoDocument';
import { useRafThrottleCallback } from '@/hooks/useRafThrottleCallback';
import {
  useInterviewerJavaSnapshots,
  INTERVIEWER_SNAPSHOT_INTERVAL_MS,
} from '@/hooks/useInterviewerJavaSnapshots';
import { staffAuthedFetch } from '@/auth/staffAuthedFetch';
import { cursorDecorationKey } from '@/utils/cursorDecorationKey';
import { defineNeoTheme, NEO_THEME_NAME } from '@/styles/monacoTheme';
import styles from './CodeViewer.module.css';

const MonacoEditor = lazy(() => import('@monaco-editor/react'));

type IStandaloneCodeEditor = Parameters<OnMount>[0];
type Monaco                = Parameters<OnMount>[1];

const handleBeforeMount: BeforeMount = (monaco) => {
  defineNeoTheme(monaco);
};

/** LanguageSelector values → Monaco language ids */
const MONACO_LANG: Record<string, string> = {
  Python:     'python',
  Java:       'java',
  Kotlin:     'kotlin',
  JavaScript: 'javascript',
  'C++':      'cpp',
  Bash:       'shell',
};

function toMonacoLanguage(id: string): string {
  return MONACO_LANG[id] ?? id.toLowerCase();
}

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
  language:         string;
  onLanguageChange: (lang: string) => void;
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

  const editorRef      = useRef<IStandaloneCodeEditor | null>(null);
  const monacoRef      = useRef<Monaco | null>(null);
  const decorationsRef = useRef<string[]>([]);
  const initialCodeRef = useRef<string | null>(null);
  const initialLangRef = useRef<string | null>(null);
  const liveCodeRef    = useRef<string | null>(null);
  const suppressOutboundRef = useRef(false);
  const skipNextLanguageSendRef = useRef(false);
  const languageRef = useRef(language);
  const lastLocalEditAtRef = useRef(0);
  const lastCursorKeyRef = useRef('');
  const [editorMountTick, setEditorMountTick] = useState(0);
  const [blurTick, setBlurTick] = useState(0);
  const blurEditorDisposableRef = useRef<{ dispose: () => void } | null>(null);
  const showCursorRef  = useRef(showCursor);

  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  useEffect(() => {
    showCursorRef.current = showCursor;
  }, [showCursor]);

  const prevShowCursorRef = useRef(showCursor);

  const getCodeForSnapshot = useCallback(() => editorRef.current?.getValue() ?? '', []);

  const {
    sendSnapshot,
    isStompReady,
    stompError: stompSnapshotError,
    canSnapshot,
  } = useInterviewerJavaSnapshots({
    idRoom,
    token,
    language,
    getCode: getCodeForSnapshot,
    enabled: true,
  });

  const { liveCode, isConnected, error, sendCode, seedLatestText, flushSend } = useWebSocket({
    idRoom,
    role:       'interviewer',
    token,
    idLanguage: language,
  });
  const {
    error:              cursorError,
    cursorFromCandidate,
    sendCursorPosition,
    sendCursorHide,
    invalidatePeerCursor,
  } = useCursorSocket({
    interviewId: idRoom,
    role: 'interviewer',
  });

  const sendCursorPositionRaf = useRafThrottleCallback(
    useCallback(
      (line: number, column: number, sel?: CursorSelectionData) => {
        sendCursorPosition(line, column, sel);
      },
      [sendCursorPosition],
    ),
  );

  useEffect(() => { if (liveCode) liveCodeRef.current = liveCode.textContent; }, [liveCode]);

  useEffect(() => { if (isConnected) onConnect(); }, [isConnected, onConnect]);
  useEffect(() => { if (error)       onError(error); }, [error, onError]);

  useEffect(() => {
    const prev = prevShowCursorRef.current;
    prevShowCursorRef.current = showCursor;
    if (prev && !showCursor) {
      sendCursorHide();
    }
  }, [showCursor, sendCursorHide]);

  useEffect(() => {
    return () => {
      blurEditorDisposableRef.current?.dispose();
      blurEditorDisposableRef.current = null;
    };
  }, []);

  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        lastLocalEditAtRef.current = 0;
        const ed = editorRef.current;
        if (ed) flushSend(ed.getValue());
        else flushSend();
        setBlurTick((n) => n + 1);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [flushSend]);

  useEffect(() => {
    async function fetchInitialCode() {
      try {
        const res = await staffAuthedFetch(`/api/v1/rooms/${idRoom}/code/latest`);
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
          runRemoteDocumentApply(suppressOutboundRef, () => {
            applyRemoteMonacoDocument(editorRef.current!, code);
          });
          seedLatestText(editorRef.current.getValue());
          const model = editorRef.current.getModel();
          if (model && monacoRef.current) {
            monacoRef.current.editor.setModelLanguage(model, toMonacoLanguage(lang));
          }
        }
      } catch {
        // Non-fatal — WS will populate content
      }
    }
    void fetchInitialCode();
  }, [seedLatestText]); // eslint-disable-line react-hooks/exhaustive-deps -- idRoom/token stable

  useRoomCodeSync({
    liveCode,
    editorRef,
    monacoRef,
    languageRef,
    onPeerLanguage:         onLanguageChange,
    skipNextLanguageSendRef,
    lastLocalEditAtRef,
    blurTick,
    seedLatestText,
    suppressOutboundRef,
    toMonacoLanguage,
    invalidatePeerCursor,
  });

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const key = cursorDecorationKey(cursorFromCandidate ?? null);
    if (key === lastCursorKeyRef.current) return;
    lastCursorKeyRef.current = key;

    if (!cursorFromCandidate) {
      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);
      return;
    }

    const model = editor.getModel();
    if (!model) return;
    const clampLine = (l: number) => Math.min(Math.max(l, 1), model.getLineCount());
    const clampCol  = (l: number, c: number) =>
      Math.min(Math.max(c, 1), model.getLineMaxColumn(l));
    const line = clampLine(cursorFromCandidate.line);
    const col  = clampCol(line, cursorFromCandidate.column);

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, [
      {
        range: {
          startLineNumber: line,
          startColumn:     col,
          endLineNumber:   line,
          endColumn:       col,
        },
        options: { className: 'candidate-cursor-decoration' },
      },
    ]);
  }, [cursorFromCandidate, editorMountTick]);

  useEffect(() => {
    const model = editorRef.current?.getModel();
    if (model && monacoRef.current) {
      monacoRef.current.editor.setModelLanguage(model, toMonacoLanguage(language));
    }
  }, [language]);

  const prevLanguageRef = useRef(language);
  useEffect(() => {
    if (prevLanguageRef.current === language) return;
    prevLanguageRef.current = language;
    if (skipNextLanguageSendRef.current) {
      skipNextLanguageSendRef.current = false;
      return;
    }
    sendCode(editorRef.current?.getValue() ?? '');
  }, [language, sendCode]);

  const handleEditorChange = useCallback<OnChange>((value) => {
    if (suppressOutboundRef.current) return;
    lastLocalEditAtRef.current = Date.now();
    sendCode(value ?? '');
  }, [sendCode]);

  const handleEditorMount = useCallback<OnMount>((editor, monaco) => {
    editorRef.current  = editor;
    monacoRef.current  = monaco;

    editor.onDidChangeCursorSelection((e) => {
      if (!showCursorRef.current) return;
      const sel = e.selection;
      if (sel.isEmpty()) {
        sendCursorPositionRaf(sel.positionLineNumber, sel.positionColumn);
      } else {
        sendCursorPositionRaf(sel.positionLineNumber, sel.positionColumn, {
          selStartLine: sel.startLineNumber,
          selStartCol:  sel.startColumn,
          selEndLine:   sel.endLineNumber,
          selEndCol:    sel.endColumn,
        });
      }
    });

    blurEditorDisposableRef.current?.dispose();
    blurEditorDisposableRef.current = editor.onDidBlurEditorWidget(() => {
      lastLocalEditAtRef.current = 0;
      flushSend(editor.getValue());
      setBlurTick((n) => n + 1);
    });

    const code = liveCodeRef.current ?? initialCodeRef.current;
    if (code !== null) {
      runRemoteDocumentApply(suppressOutboundRef, () => {
        applyRemoteMonacoDocument(editor, code);
      });
    }

    if (initialLangRef.current !== null) {
      const model = editor.getModel();
      if (model) monaco.editor.setModelLanguage(model, toMonacoLanguage(initialLangRef.current));
    }

    seedLatestText(editor.getValue());
    setEditorMountTick((n) => n + 1);
  }, [sendCursorPositionRaf, flushSend, seedLatestText]);

  const snapshotHint = useMemo(() => {
    if (!canSnapshot) {
      return 'Снимки в БД Java: в JWT нет числового id (нужен вход через бэкенд, не мок-токен).';
    }
    if (stompSnapshotError) return stompSnapshotError;
    if (isStompReady) {
      return `STOMP к Java: снимок каждые ${INTERVIEWER_SNAPSHOT_INTERVAL_MS / 1000} с + кнопка ниже.`;
    }
    return 'Подключение STOMP к Java…';
  }, [canSnapshot, stompSnapshotError, isStompReady]);

  return (
    <div className={styles.codeViewerRoot}>

      {(error !== null || cursorError !== null) && (
        <div className={styles.errorBanner} role="alert">
          Соединение потеряно. Проверьте каналы code/cursor.
        </div>
      )}

      <div className={styles.snapshotBar}>
        <button
          type="button"
          className={styles.snapshotBtn}
          disabled={!canSnapshot || !isStompReady}
          onClick={() => { sendSnapshot(); }}
        >
          Снимок кода → Java
        </button>
        <span
          className={`${styles.snapshotHint} ${isStompReady && canSnapshot ? styles.snapshotOk : styles.snapshotWarn}`}
        >
          {snapshotHint}
        </span>
      </div>

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
