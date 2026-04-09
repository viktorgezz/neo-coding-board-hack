import { useCallback, useEffect, useRef, useState } from 'react';

export type CursorSocketRole = 'candidate' | 'interviewer';

interface CursorInMessage {
  line: number;
  column: number;
}

interface CursorOutMessage {
  line: number;
  column: number;
  timestamp: number;
  from_role: CursorSocketRole;
}

interface UseCursorSocketParams {
  interviewId: string;
  role: CursorSocketRole;
}

interface UseCursorSocketResult {
  isConnected: boolean;
  error: string | null;
  cursorFromCandidate: CursorOutMessage | null;
  cursorFromInterviewer: CursorOutMessage | null;
  sendCursorPosition: (line: number, column: number) => void;
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
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef(0);
  const isUnmountingRef = useRef(false);

  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cursorFromCandidate, setCursorFromCandidate] = useState<CursorOutMessage | null>(null);
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
          setCursorFromInterviewer(payload);
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

  const sendCursorPosition = useCallback((line: number, column: number) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const payload: CursorInMessage = { line, column };
    ws.send(JSON.stringify(payload));
  }, []);

  return {
    isConnected,
    error,
    cursorFromCandidate,
    cursorFromInterviewer,
    sendCursorPosition,
  };
}
