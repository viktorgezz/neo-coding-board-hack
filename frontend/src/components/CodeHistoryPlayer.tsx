/**
 * CodeHistoryPlayer — read-only viewer for code snapshots of a finished room.
 *
 * Fetches all snapshots from GET /api/v1/rooms/{idRoom}/code/snapshots,
 * then lets the user navigate them via:
 *   - a range slider
 *   - prev / next arrow buttons
 *
 * Monaco is loaded lazily (same chunk as CodeViewer when Vite splits it).
 */

import { lazy, Suspense, useEffect, useRef, useState, useCallback } from 'react';
import type { OnMount, BeforeMount } from '@monaco-editor/react';
import { staffAuthedFetch } from '@/auth/staffAuthedFetch';
import { defineNeoTheme, NEO_THEME_NAME } from '@/styles/monacoTheme';
import styles from './CodeHistoryPlayer.module.css';

const MonacoEditor = lazy(() => import('@monaco-editor/react'));

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CodeSnapshot {
  id: string;
  textCode: string;
  language: string;
  timeCreated: string;
  timeOffset: string;
}

export interface CodeHistoryPlayerProps {
  idRoom: string;
  token:  string;
}

// ---------------------------------------------------------------------------
// Monaco language id map (mirrors CodeViewer)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Monaco options — read-only, minimal chrome
// ---------------------------------------------------------------------------

const MONACO_OPTIONS: Parameters<typeof MonacoEditor>[0]['options'] = {
  readOnly:             true,
  fontSize:             14,
  minimap:              { enabled: false },
  scrollBeyondLastLine: false,
  wordWrap:             'on',
  padding:              { top: 12 },
  renderLineHighlight:  'none',
  overviewRulerLanes:   0,
  cursorStyle:          'line',
  domReadOnly:          true,
  // Hide read-only badge that Monaco shows by default
  readOnlyMessage:      { value: '' },
};

const handleBeforeMount: BeforeMount = (monaco) => {
  defineNeoTheme(monaco);
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('ru-RU', {
      hour:   '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return iso;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CodeHistoryPlayer({ idRoom }: CodeHistoryPlayerProps) {
  const [snapshots,  setSnapshots]  = useState<CodeSnapshot[]>([]);
  const [index,      setIndex]      = useState(0);
  const [isLoading,  setIsLoading]  = useState(true);
  const [loadError,  setLoadError]  = useState<string | null>(null);

  // Keep a ref to the Monaco editor instance so we can imperatively update
  // the model instead of reconstructing it on each step.
  type IEditor = Parameters<OnMount>[0];
  type IMonaco = Parameters<OnMount>[1];
  const editorRef = useRef<IEditor | null>(null);
  const monacoRef = useRef<IMonaco | null>(null);

  // ---------------------------------------------------------------------------
  // Fetch snapshots once on mount
  // ---------------------------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const res = await staffAuthedFetch(
          `/api/v1/rooms/${idRoom}/code/snapshots`,
        );
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json() as { content: CodeSnapshot[] };
        if (!cancelled) {
          setSnapshots(data.content ?? []);
          setIndex(0);
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err instanceof Error
              ? err.message
              : 'Ошибка при загрузке истории кода.',
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [idRoom]);

  // ---------------------------------------------------------------------------
  // Sync Monaco model when index or snapshots change
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const snap   = snapshots[index];
    if (!editor || !monaco || !snap) return;

    // Update language
    const model = editor.getModel();
    if (model) {
      monaco.editor.setModelLanguage(model, toMonacoLanguage(snap.language));
    }

    // Replace content
    editor.setValue(snap.textCode ?? '');
    // Scroll to top so the editor always starts at the beginning of the snapshot
    editor.revealLine(1);
  }, [index, snapshots]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handlePrev = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  const handleNext = useCallback(() => {
    setIndex((i) => Math.min(snapshots.length - 1, i + 1));
  }, [snapshots.length]);

  const handleSlider = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setIndex(Number(e.target.value));
  }, []);

  const handleEditorMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    const snap = snapshots[index];
    if (snap) {
      editor.setValue(snap.textCode ?? '');
      const model = editor.getModel();
      if (model) {
        monaco.editor.setModelLanguage(model, toMonacoLanguage(snap.language));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- snapshots are stable here
  }, []);

  // ---------------------------------------------------------------------------
  // Current snapshot metadata
  // ---------------------------------------------------------------------------

  const currentSnap = snapshots[index];
  const total       = snapshots.length;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className={styles.playerRoot}>
        <div className={styles.skeleton} aria-label="Загрузка истории кода…" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={styles.playerRoot}>
        <div className={styles.errorMsg} role="alert">
          Не удалось загрузить историю кода: {loadError}
        </div>
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className={styles.playerRoot}>
        <div className={styles.emptyMsg}>
          Снимки кода для этой сессии отсутствуют.
        </div>
      </div>
    );
  }

  return (
    <div className={styles.playerRoot}>

      {/* ── Meta row ────────────────────────────────────────────────────── */}
      <div className={styles.metaRow}>
        <span className={styles.metaBadge}>
          Снимок&nbsp;
          <strong>{index + 1}</strong>
          &nbsp;из&nbsp;
          <strong>{total}</strong>
        </span>

        {currentSnap && (
          <>
            <span className={styles.metaDot}>·</span>
            <span className={styles.metaItem}>
              <span className={styles.metaLabel}>Время:</span>
              {currentSnap.timeOffset}
            </span>
            <span className={styles.metaDot}>·</span>
            <span className={styles.metaItem}>
              <span className={styles.metaLabel}>Язык:</span>
              {currentSnap.language}
            </span>
            <span className={styles.metaDot}>·</span>
            <span className={styles.metaItem}>
              <span className={styles.metaLabel}>Сохранён:</span>
              {formatTimestamp(currentSnap.timeCreated)}
            </span>
          </>
        )}
      </div>

      {/* ── Controls ────────────────────────────────────────────────────── */}
      <div className={styles.controls}>
        <button
          id="code-history-prev"
          type="button"
          className={styles.navBtn}
          onClick={handlePrev}
          disabled={index === 0}
          aria-label="Предыдущий снимок"
        >
          ‹
        </button>

        <input
          id="code-history-slider"
          type="range"
          className={styles.slider}
          min={0}
          max={total - 1}
          value={index}
          onChange={handleSlider}
          aria-label={`Снимок ${index + 1} из ${total}`}
        />

        <button
          id="code-history-next"
          type="button"
          className={styles.navBtn}
          onClick={handleNext}
          disabled={index === total - 1}
          aria-label="Следующий снимок"
        >
          ›
        </button>
      </div>

      {/* ── Monaco editor (read-only) ────────────────────────────────────── */}
      <div className={styles.editorWrap}>
        <Suspense fallback={<div className={styles.editorFallback} />}>
          <MonacoEditor
            height="100%"
            defaultLanguage="plaintext"
            defaultValue={currentSnap?.textCode ?? ''}
            theme={NEO_THEME_NAME}
            beforeMount={handleBeforeMount}
            options={MONACO_OPTIONS}
            onMount={handleEditorMount}
          />
        </Suspense>
      </div>

    </div>
  );
}
