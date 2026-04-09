/**
 * useWebSocket — raw WebSocket to WSCodeService (NEO Code WS).
 *
 * Endpoint: `${VITE_CODE_WS_BASE_URL}/ws/{idRoom}/{role}` — role is
 * `candidate` | `interviewer`. First server message is `snapshot`; peers
 * receive `update` after each valid client payload. The sender does not
 * get an echo (see WSCodeService README).
 *
 * REST `GET .../code/latest` in pages bootstraps the editor when the WS
 * snapshot is empty (version 0) — the hook skips applying that snapshot
 * so it does not clear REST-loaded content.
 *
 * Cursor positions use useCursorSocket, not this hook.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// ---------------------------------------------------------------------------
// WSCodeService message shapes (snake_case on the wire)
// ---------------------------------------------------------------------------

interface WsSnapshotMessage {
  type:          'snapshot';
  text_content:  string;
  id_language:   string;
  version:       number;
}

interface WsUpdateMessage {
  type:          'update';
  text_content:  string;
  id_language:   string;
  version:       number;
  from_role:     'candidate' | 'interviewer';
  timestamp:     number;
}

type WsInbound = WsSnapshotMessage | WsUpdateMessage | { error?: string };

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface LiveCodeState {
  textContent: string;
  idLanguage:  string;
  /** Server monotonic version — used to skip duplicate React updates. */
  version:     number;
}

export type WebSocketRole = 'candidate' | 'interviewer';

export interface UseWebSocketParams {
  idRoom:      string;
  role:        WebSocketRole;
  /** Unused by WSCodeService; kept for API compatibility with callers. */
  token:       string;
  idLanguage?: string;
}

export interface UseWebSocketReturn {
  sendCode:       (textContent: string) => void;
  /** Sync ref when editor text comes from REST/defaultValue without onChange (avoids empty flush). */
  seedLatestText: (textContent: string) => void;
  /** Sends immediately; pass `editor.getValue()` so flush never wipes the room with stale ''. */
  flushSend:      (textOverride?: string) => void;
  liveCode:       LiveCodeState | null;
  isConnected:    boolean;
  error:          string | null;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

function getCodeSocketBaseUrl(): string {
  const configured = import.meta.env.VITE_CODE_WS_BASE_URL as string | undefined;
  if (configured && configured.trim()) {
    return configured.trim().replace(/\/$/, '');
  }
  return 'ws://111.88.127.60:8003';
}

const BACKOFF_DELAYS: [number, number, number] = [1000, 2000, 4000];

/** Short debounce — long delays let peer full snapshots overwrite unsent local edits */
const SEND_DEBOUNCE_MS = 55;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useWebSocket({
  idRoom,
  role,
  token,
  idLanguage = '',
}: UseWebSocketParams): UseWebSocketReturn {
  void token;

  const wsRef               = useRef<WebSocket | null>(null);
  const debounceTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const idLanguageRef       = useRef(idLanguage);
  const latestTextRef       = useRef('');
  const isUnmountingRef     = useRef(false);

  const [isConnected, setIsConnected] = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [liveCode, setLiveCode]       = useState<LiveCodeState | null>(null);
  /** Dedupe identical wire duplicates only — do NOT gate by version vs UI apply */
  const lastWireSnapshotRef = useRef<{ v: number; t: string } | null>(null);
  const lastWireUpdateRef   = useRef<{ v: number; t: string; lang: string } | null>(null);

  useEffect(() => {
    idLanguageRef.current = idLanguage ?? '';
  }, [idLanguage]);

  useEffect(() => {
    function scheduleReconnect(): void {
      if (reconnectAttemptsRef.current >= 3) {
        setError('Connection failed after 3 attempts. Please refresh the page.');
        return;
      }
      const delay = BACKOFF_DELAYS[reconnectAttemptsRef.current];
      reconnectAttemptsRef.current += 1;
      reconnectTimerRef.current = setTimeout(() => {
        connect();
      }, delay);
    }

    function handleMessage(raw: string): void {
      let msg: WsInbound;
      try {
        msg = JSON.parse(raw) as WsInbound;
      } catch {
        return;
      }
      if ('error' in msg && msg.error) {
        setError('invalid_code_payload from server');
        return;
      }
      if (!('type' in msg)) return;

      if (msg.type === 'snapshot') {
        const s = msg as WsSnapshotMessage;
        if (s.version === 0 && s.text_content === '') {
          return;
        }
        const dup = lastWireSnapshotRef.current;
        if (dup && dup.v === s.version && dup.t === s.text_content) {
          return;
        }
        lastWireSnapshotRef.current = { v: s.version, t: s.text_content };
        setLiveCode({
          textContent: s.text_content,
          idLanguage:  s.id_language || 'plaintext',
          version:     s.version,
        });
        return;
      }
      if (msg.type === 'update') {
        const u = msg as WsUpdateMessage;
        const lang = u.id_language || 'plaintext';
        const dup = lastWireUpdateRef.current;
        if (dup && dup.v === u.version && dup.t === u.text_content && dup.lang === lang) {
          return;
        }
        lastWireUpdateRef.current = { v: u.version, t: u.text_content, lang };
        setLiveCode({
          textContent: u.text_content,
          idLanguage:  lang,
          version:     u.version,
        });
      }
    }

    function connect(): void {
      const base = getCodeSocketBaseUrl();
      const ws = new WebSocket(`${base}/ws/${encodeURIComponent(idRoom)}/${role}`);
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectAttemptsRef.current = 0;
        lastWireSnapshotRef.current = null;
        lastWireUpdateRef.current = null;
        setIsConnected(true);
        setError(null);
      };

      ws.onmessage = (event) => {
        handleMessage(event.data as string);
      };

      ws.onerror = () => {
        setError('WebSocket connection lost.');
      };

      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;
        if (isUnmountingRef.current) return;
        scheduleReconnect();
      };
    }

    isUnmountingRef.current = false;
    connect();

    return () => {
      isUnmountingRef.current = true;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const sendCode = useCallback((textContent: string) => {
    latestTextRef.current = textContent;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;

      const payload = {
        text_content: latestTextRef.current,
        id_language:  idLanguageRef.current || '',
      };
      ws.send(JSON.stringify(payload));
    }, SEND_DEBOUNCE_MS);
  }, []);

  const seedLatestText = useCallback((textContent: string) => {
    latestTextRef.current = textContent;
  }, []);

  const flushSend = useCallback((textOverride?: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    const text = textOverride !== undefined ? textOverride : latestTextRef.current;
    latestTextRef.current = text;
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({
      text_content: text,
      id_language:  idLanguageRef.current || '',
    }));
  }, []);

  return {
    sendCode,
    seedLatestText,
    flushSend,
    liveCode,
    isConnected,
    error,
  };
}
