/**
 * useWebSocket — STOMP-over-WebSocket hook for Neo Coding Board.
 *
 * Abstracts the full STOMP lifecycle (connect → subscribe → send →
 * reconnect → cleanup) for both roles:
 *
 *   candidate  — sends textContent (debounced 300ms) + cursor (immediate).
 *                No subscription created. Token from candidateSession.
 *
 *   interviewer — fetches initial code state on connect, then subscribes
 *                 to /topic/code/{idRoom}/stream for live updates.
 *                 No publish. Token from useAuth().
 *
 * This hook does NOT call useAuth() — token is provided by the caller so
 * both roles can use the same hook without coupling to the auth layer.
 * It does NOT navigate on error — errors surface via the `error` field only.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Client, type IFrame, type StompSubscription } from '@stomp/stompjs';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface CandidateCodePayload {
  textContent: string;
  idLanguage:  string;
  cursorLine:  number;
  cursorCh:    number;
}

export interface InterviewerCodeUpdate {
  textContent:   string;
  idParticipant: string;
  cursorLine:    number;
  cursorCh:      number;
}

export interface LiveCodeState {
  textContent:   string;
  idParticipant: string | null;
}

export interface LiveCursorState {
  cursorLine:    number;
  cursorCh:      number;
  idParticipant: string | null;
}

export type WebSocketRole = 'candidate' | 'interviewer';

export interface UseWebSocketParams {
  idRoom:      string;
  role:        WebSocketRole;
  /** candidate: getCandidateToken(), interviewer: token from useAuth() */
  token:       string;
  /** candidate only — current language selection; synced to a ref via a separate useEffect */
  idLanguage?: string;
}

export interface UseWebSocketReturn {
  /** candidate only — debounced 300ms internally */
  sendCode:    (textContent: string) => void;
  /** candidate only — immediate, no debounce */
  sendCursor:  (line: number, ch: number) => void;
  /** interviewer only — null until first message or initial fetch */
  liveCode:    LiveCodeState | null;
  /** interviewer only — null until first message */
  liveCursor:  LiveCursorState | null;
  isConnected: boolean;
  error:       string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Converts the current page origin to a WebSocket base URL.
 * Pure string transform — no environment variable, no hardcoded host.
 */
function getWebSocketBaseURL(): string {
  const { protocol, host } = window.location;
  const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProtocol}//${host}`;
}

/** Indexed by attempt number (0-based): 1s → 2s → 4s, then stop. */
const BACKOFF_DELAYS: [number, number, number] = [1000, 2000, 4000];

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useWebSocket({
  idRoom,
  role,
  token,
  idLanguage = '',
}: UseWebSocketParams): UseWebSocketReturn {

  // ── Refs — never trigger re-renders ───────────────────────────────────

  /** The live STOMP client instance. Never put in state — reconnects would re-render. */
  const clientRef         = useRef<Client | null>(null);
  /** Active subscription handle (interviewer only). */
  const subscriptionRef   = useRef<StompSubscription | null>(null);
  /** Debounce timer ID for sendCode. */
  const debounceTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Reconnect backoff timer ID. */
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** 0–3; reset to 0 on successful connect. */
  const reconnectAttemptsRef = useRef(0);
  /** Last known cursor position — read by sendCode to piggy-back onto the payload. */
  const cursorRef         = useRef<{ line: number; ch: number }>({ line: 0, ch: 0 });
  /**
   * Last textContent passed to sendCode — updated synchronously before the
   * debounce timer fires so sendCursor always piggy-backs the current code.
   */
  const textContentRef    = useRef('');
  /** Mirrors the idLanguage prop. Updated via a separate useEffect. */
  const idLanguageRef     = useRef(idLanguage);
  /**
   * Set to true just before intentional deactivation (component unmount) so
   * the onDisconnect callback does NOT schedule a reconnect for a deliberate
   * teardown.
   */
  const isUnmountingRef   = useRef(false);

  // ── State — one update per discrete user-visible change ───────────────

  const [isConnected, setIsConnected] = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [liveCode,    setLiveCode]    = useState<LiveCodeState | null>(null);
  const [liveCursor,  setLiveCursor]  = useState<LiveCursorState | null>(null);

  // ── idLanguage prop → ref sync ────────────────────────────────────────
  // Separate effect so it does NOT re-run the main STOMP effect when the
  // language selection changes.

  useEffect(() => {
    if (idLanguage) {
      idLanguageRef.current = idLanguage;
    }
  }, [idLanguage]);

  // ── Main STOMP effect — runs exactly once ─────────────────────────────

  useEffect(() => {

    // ── Reconnect scheduler ────────────────────────────────────────────

    function scheduleReconnect(): void {
      if (reconnectAttemptsRef.current >= 3) {
        setError('Connection failed after 3 attempts. Please refresh the page.');
        return;
      }

      const delay = BACKOFF_DELAYS[reconnectAttemptsRef.current];
      reconnectAttemptsRef.current += 1;

      reconnectTimerRef.current = setTimeout(() => {
        clientRef.current?.activate();
      }, delay);
    }

    // ── STOMP error handlers ───────────────────────────────────────────

    function handleStompError(frame: IFrame): void {
      setError(`STOMP error: ${frame.headers['message'] ?? 'Unknown error'}`);
      setIsConnected(false);
      scheduleReconnect();
    }

    function handleWebSocketError(_event: Event): void {
      setError('WebSocket connection lost.');
      setIsConnected(false);
      scheduleReconnect();
    }

    function handleDisconnect(_frame: IFrame): void {
      // Guard: if we're intentionally unmounting, do not schedule reconnect —
      // that would re-activate the client after the cleanup has already run.
      if (isUnmountingRef.current) return;
      setIsConnected(false);
      scheduleReconnect();
    }

    // ── onConnect callback ─────────────────────────────────────────────

    async function handleConnect(): Promise<void> {
      // Successful (re)connect — reset backoff counter
      reconnectAttemptsRef.current = 0;
      setIsConnected(true);
      setError(null);

      if (role === 'interviewer') {
        // 1. Fetch the latest code snapshot before subscribing.
        //    Non-fatal: WS stream will populate state as candidate types.
        try {
          const res = await fetch(`/api/v1/rooms/${idRoom}/code/latest`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json() as { textContent: string; idLanguage: string };
            setLiveCode({ textContent: data.textContent, idParticipant: null });
          }
        } catch {
          // Intentionally swallow — non-fatal, WS stream covers live updates
        }

        // 2. Subscribe to the live stream — trailing /stream is mandatory.
        const client = clientRef.current;
        if (client) {
          subscriptionRef.current = client.subscribe(
            `/topic/code/${idRoom}/stream`,
            (message) => {
              const update = JSON.parse(message.body) as InterviewerCodeUpdate;

              // Update liveCode and liveCursor atomically (two setState calls in
              // the same synchronous handler — React 18 batches them into one render)
              setLiveCode({
                textContent:   update.textContent,
                idParticipant: update.idParticipant,
              });
              setLiveCursor({
                cursorLine:    update.cursorLine,
                cursorCh:      update.cursorCh,
                idParticipant: update.idParticipant,
              });
            },
          );
        }
      }
      // candidate mode: no subscription, no initial fetch.
      // Sending is handled by sendCode() and sendCursor() below.
    }

    // ── Create and activate STOMP client ──────────────────────────────

    const client = new Client({
      brokerURL: `${getWebSocketBaseURL()}/ws`,
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      // Disable built-in reconnect — we implement manual exponential backoff
      // so we can cap attempts at 3 and surface errors to the UI.
      reconnectDelay: 0,
      onConnect:        () => { void handleConnect(); },
      onStompError:     handleStompError,
      onDisconnect:     handleDisconnect,
      onWebSocketError: handleWebSocketError,
    });

    clientRef.current = client;
    client.activate();

    // ── Cleanup on unmount ─────────────────────────────────────────────

    return () => {
      // Signal to handleDisconnect that this is intentional teardown
      isUnmountingRef.current = true;

      // 1. Cancel pending debounce — prevents a stale publish after unmount
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      // 2. Cancel pending reconnect timer
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      // 3. Unsubscribe from the live stream (interviewer only)
      subscriptionRef.current?.unsubscribe();
      // 4. Gracefully shut down the STOMP client
      void clientRef.current?.deactivate();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // ↑ Empty deps: idRoom, role, token are stable for the lifetime of this
  //   hook (the component that mounts this is tied to a single room session).
  //   idLanguage syncs via its own effect above.

  // ── sendCode — stable ref, debounced 300ms ────────────────────────────

  const sendCode = useCallback((textContent: string) => {
    if (role !== 'candidate') return;

    // Update textContentRef synchronously — sendCursor reads this ref to
    // piggy-back the latest code onto every cursor publish.
    textContentRef.current = textContent;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const client = clientRef.current;
      if (!client || !client.connected) return;

      const payload: CandidateCodePayload = {
        textContent,
        idLanguage: idLanguageRef.current,
        cursorLine: cursorRef.current.line,
        cursorCh:   cursorRef.current.ch,
      };

      client.publish({
        destination: `/app/code/${idRoom}/update`,
        body: JSON.stringify(payload),
      });
    }, 300);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // ↑ Empty deps: closures over refs (always current via .current) and
  //   idRoom/role (stable for the session). New function identity never needed.

  // ── sendCursor — stable ref, immediate ───────────────────────────────

  const sendCursor = useCallback((line: number, ch: number) => {
    if (role !== 'candidate') return;

    // Always update the ref — even when not connected — so the next sendCode
    // debounce batch includes the correct cursor position.
    cursorRef.current = { line, ch };

    const client = clientRef.current;
    if (!client || !client.connected) return;

    // Send a full payload immediately. The backend uses the same destination
    // for both text and cursor events — the server distinguishes them by
    // whether textContent has changed.
    const payload: CandidateCodePayload = {
      textContent: textContentRef.current,
      idLanguage:  idLanguageRef.current,
      cursorLine:  line,
      cursorCh:    ch,
    };

    client.publish({
      destination: `/app/code/${idRoom}/update`,
      body: JSON.stringify(payload),
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Return ─────────────────────────────────────────────────────────────

  return {
    sendCode,
    sendCursor,
    liveCode,
    liveCursor,
    isConnected,
    error,
  };
}
