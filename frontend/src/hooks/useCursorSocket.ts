import { useCallback, useEffect, useRef, useState } from 'react';

export type CursorSocketRole = 'candidate' | 'interviewer';

interface CursorInMessage {
  line:          number;
  column:        number;
  selStartLine?: number;
  selStartCol?:  number;
  selEndLine?:   number;
  selEndCol?:    number;
}

export interface CursorOutMessage {
  line:          number;
  column:        number;
  timestamp:     number;
  from_role:     CursorSocketRole;
  selStartLine?: number;
  selStartCol?:  number;
  selEndLine?:   number;
  selEndCol?:    number;
}

interface UseCursorSocketParams {
  interviewId: string;
  role:        CursorSocketRole;
}

export interface CursorSelectionData {
  selStartLine: number;
  selStartCol:  number;
  selEndLine:   number;
  selEndCol:    number;
}

interface UseCursorSocketResult {
  isConnected:          boolean;
  error:                string | null;
  cursorFromCandidate:  CursorOutMessage | null;
  cursorFromInterviewer: CursorOutMessage | null;
  /** Send cursor position, optionally with a selection range. */
  sendCursorPosition:   (line: number, column: number, sel?: CursorSelectionData) => void;
  /** Send an explicit "cursor hidden" signal to clear the remote decoration. */
  sendCursorHide:       () => void;
}

const BACKOFF_MS: [number, number, number] = [1000, 2000, 4000];

function getCursorSocketBaseUrl(): string {
  const configured = import.meta.env.VITE_CURSOR_WS_BASE_URL as string | undefined;
  if (configured && configured.trim()) {
    return configured.trim().replace(/\/$/, '');
  }
  return 'ws://72.56.248.147:8002';
}

export function useCursorSocket({
  interviewId,
  role,
}: UseCursorSocketParams): UseCursorSocketResult {
  const wsRef               = useRef<WebSocket | null>(null);
  const reconnectTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef(0);
  const isUnmountingRef     = useRef(false);

  const [isConnected,           setIsConnected]           = useState(false);
  const [error,                 setError]                 = useState<string | null>(null);
  const [cursorFromCandidate,   setCursorFromCandidate]   = useState<CursorOutMessage | null>(null);
  const [cursorFromInterviewer, setCursorFromInterviewer] = useState<CursorOutMessage | null>(null);

  const connect = useCallback(() => {
    const base = getCursorSocketBaseUrl();
    const ws = new WebSocket(`${base}/ws/${interviewId}/${role}`);
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectAttemptRef.current = 0;
      setError(null);
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as CursorOutMessage;
        if (payload.from_role === 'candidate') {
          setCursorFromCandidate(payload);
        } else if (payload.from_role === 'interviewer') {
          // line < 0 is the sentinel for "cursor hidden".
          // The relay server forwards line/column as-is, so negative values
          // arrive intact even if the server doesn't know about `hidden`.
          if (payload.line < 0) {
            setCursorFromInterviewer(null);
          } else {
            setCursorFromInterviewer(payload);
          }
        }
      } catch {
        // non-fatal parse error
      }
    };

    ws.onerror = () => {
      setError('Ошибка соединения cursor-сокета');
    };

    ws.onclose = () => {
      setIsConnected(false);
      if (isUnmountingRef.current) return;
      if (reconnectAttemptRef.current >= BACKOFF_MS.length) {
        setError('Не удалось подключиться к cursor-сервису');
        return;
      }
      const delay = BACKOFF_MS[reconnectAttemptRef.current];
      reconnectAttemptRef.current += 1;
      reconnectTimerRef.current = setTimeout(() => {
        connect();
      }, delay);
    };
  }, [interviewId, role]);

  useEffect(() => {
    isUnmountingRef.current = false;
    connect();
    return () => {
      isUnmountingRef.current = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      wsRef.current?.close();
    };
  }, [connect]);

  const sendCursorPosition = useCallback((
    line:   number,
    column: number,
    sel?:   CursorSelectionData,
  ) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const payload: CursorInMessage = { line, column, ...sel };
    ws.send(JSON.stringify(payload));
  }, []);

  const sendCursorHide = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    // line: -1 is the sentinel — backend relay forwards it as-is.
    // Candidate's onmessage checks line < 0 and clears the decoration.
    ws.send(JSON.stringify({ line: -1, column: -1 } satisfies CursorInMessage));
  }, []);

  return {
    isConnected,
    error,
    cursorFromCandidate,
    cursorFromInterviewer,
    sendCursorPosition,
    sendCursorHide,
  };
}
