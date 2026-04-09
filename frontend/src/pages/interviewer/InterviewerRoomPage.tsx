/**
 * InterviewerRoomPage — /interviewer/sessions/:id
 *
 * Full-viewport live panel: a single 48px header + flex-row main area.
 *
 * Header owns:
 *   Left  — WS status dot · LanguageSelector · cursor-visibility toggle
 *   Right — InterviewTimer
 *
 * Language and cursor-visibility state live here so the header can render
 * them without an extra sub-header inside CodeViewer.
 * All WS / API / note-CRUD logic stays inside CodeViewer and NotesPanel.
 */

import { useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/useAuth';
import CodeViewer from '@/components/CodeViewer';
import NotesPanel from '@/components/NotesPanel';
import VerdictModal from '@/components/VerdictModal';
import LanguageSelector from '@/components/LanguageSelector';
import InterviewTimer from '@/components/InterviewTimer';
import styles from './InterviewerRoomPage.module.css';

export default function InterviewerRoomPage() {
  const { id: idRoom = '' } = useParams<{ id: string }>();
  const { token }           = useAuth();
  const navigate            = useNavigate();

  const startTimeRef = useRef(Date.now());

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [wsStatus,    setWsStatus]    = useState<'connecting' | 'live' | 'disconnected'>('connecting');
  const [language,    setLanguage]    = useState('plaintext');
  const [showCursor,  setShowCursor]  = useState(true);

  const handleVerdictConfirmed = useCallback(() => {
    navigate(`/interviewer/sessions/${idRoom}/report`, { replace: true });
  }, [navigate, idRoom]);

  const handleWsConnect = useCallback(() => { setWsStatus('live');         }, []);
  const handleWsError   = useCallback(() => { setWsStatus('disconnected'); }, []);

  const resolvedToken = token ?? '';

  return (
    <div className={styles.roomRoot}>

      {/* ── Page header ─────────────────────────────────────────────── */}
      <header className={styles.pageHeader}>

        <div className={styles.headerLeft}>
          {/* Connection status */}
          <span className={`${styles.statusDot} ${
            wsStatus === 'live'         ? styles.dotOn  :
            wsStatus === 'disconnected' ? styles.dotErr :
                                         styles.dotOff
          }`} />
          <span className={`${styles.statusLabel} ${
            wsStatus === 'live'         ? styles.labelOn  :
            wsStatus === 'disconnected' ? styles.labelErr :
                                         styles.labelOff
          }`}>
            {wsStatus === 'live' ? 'Live' : wsStatus === 'disconnected' ? 'Disconnected' : 'Connecting...'}
          </span>

          {/* Language selector */}
          <LanguageSelector value={language} onChange={setLanguage} />

          {/* Cursor-visibility toggle */}
          <button
            type="button"
            className={styles.cursorToggleBtn}
            onClick={() => setShowCursor((v) => !v)}
            title={showCursor ? 'Скрыть курсор' : 'Показать курсор'}
            aria-label={showCursor ? 'Скрыть курсор' : 'Показать курсор'}
            aria-pressed={!showCursor}
          >
            {showCursor ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            )}
          </button>
        </div>

        <div className={styles.headerRight}>
          <InterviewTimer startTime={startTimeRef.current} />
        </div>

      </header>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <div className={styles.mainContent}>

        {/* Left: read-only Monaco via CodeViewer */}
        <div className={styles.codeColumn}>
          <CodeViewer
            idRoom={idRoom}
            token={resolvedToken}
            language={language}
            onLanguageChange={setLanguage}
            showCursor={showCursor}
            onConnect={handleWsConnect}
            onError={handleWsError}
          />
        </div>

        {/* Right: notes panel */}
        <div className={styles.notesColumn}>
          <NotesPanel
            idRoom={idRoom}
            token={resolvedToken}
            onFinish={() => setIsModalOpen(true)}
          />
        </div>

      </div>

      {/* ── Verdict modal ────────────────────────────────────────────── */}
      {isModalOpen && (
        <VerdictModal
          idRoom={idRoom}
          token={resolvedToken}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleVerdictConfirmed}
        />
      )}

    </div>
  );
}
