/**
 * InterviewerRoomPage — /interviewer/sessions/:id
 *
 * Orchestrates three concurrent systems inside a 65/35 split layout:
 *
 *   Left (65%)  — CodeViewer: read-only Monaco + WS subscription
 *   Right (35%) — NotesPanel: timestamped notes CRUD + timer
 *
 * This page owns:
 *   - isModalOpen state — controls VerdictModal visibility
 *   - startTime ref     — Date.now() on mount, stable for timer lifetime
 *   - token             — read from useAuth(), passed to all children
 *
 * VerdictModal is only mounted when isModalOpen is true.
 * It renders via ReactDOM.createPortal to document.body (inside VerdictModal).
 *
 * Navigation paths use the router's actual route definitions, not the
 * spec's /interviewer/room/* pattern which doesn't match the route tree.
 */

import { useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/useAuth';
import CodeViewer from '@/components/CodeViewer';
import NotesPanel from '@/components/NotesPanel';
import VerdictModal from '@/components/VerdictModal';
import styles from './InterviewerRoomPage.module.css';

export default function InterviewerRoomPage() {
  const { id: idRoom = '' } = useParams<{ id: string }>();
  const { token }           = useAuth();
  const navigate            = useNavigate();

  // Captured once at mount — passed to NotesPanel for InterviewTimer.
  // useRef: stable identity, no re-render when page re-renders.
  const startTimeRef = useRef(Date.now());

  const [isModalOpen, setIsModalOpen] = useState(false);

  // ── Verdict confirmed → navigate to report ─────────────────────────────

  const handleVerdictConfirmed = useCallback(() => {
    // replace: true — interviewer should not navigate back into a finished room
    navigate(`/interviewer/sessions/${idRoom}/report`, { replace: true });
  }, [navigate, idRoom]);

  // ── WS callbacks (CodeViewer → page) ─────────────────────────────────

  const handleWsConnect = useCallback(() => {
    // CodeViewer owns its own status dot — no page-level action needed
  }, []);

  const handleWsError = useCallback((_msg: string) => {
    // CodeViewer renders its own error banner — no page-level action needed
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────

  const resolvedToken = token ?? '';

  return (
    <div className={styles.roomRoot}>

      {/* ── Left column: read-only Monaco + WS ── */}
      <div className={styles.codeColumn}>
        <CodeViewer
          idRoom={idRoom}
          token={resolvedToken}
          onConnect={handleWsConnect}
          onError={handleWsError}
        />
      </div>

      {/* ── Right column: notes + timer + finish button ── */}
      <div className={styles.notesColumn}>
        <NotesPanel
          idRoom={idRoom}
          token={resolvedToken}
          startTime={startTimeRef.current}
          onFinish={() => setIsModalOpen(true)}
        />
      </div>

      {/* ── Verdict modal — mounted only when open, portal to document.body ── */}
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
