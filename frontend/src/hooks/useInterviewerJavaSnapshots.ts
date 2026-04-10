/**
 * STOMP → Spring `/app/code/update` (CodeWsController → CodeAsyncCommandService).
 * Новый REST в Java не нужен. JWT на WS-handshake из браузера недоступен — в URL
 * добавляется `?access_token=…`; nginx (prod) и Vite (dev) подставляют Authorization.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import { decodeJwtNumericUserId } from '@/auth/jwt';

const STOMP_DESTINATION = '/app/code/update';
export const INTERVIEWER_SNAPSHOT_INTERVAL_MS = 20_000;

function buildBrokerUrl(token: string): string {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const q = new URLSearchParams({ access_token: token });
  return `${proto}//${window.location.host}/ws?${q.toString()}`;
}

export interface UseInterviewerJavaSnapshotsParams {
  idRoom:   string;
  token:    string;
  language: string;
  getCode:  () => string;
  enabled:  boolean;
}

export interface UseInterviewerJavaSnapshotsResult {
  sendSnapshot: () => void;
  checkLengthAndSnapshot: (len: number) => void;
  isStompReady: boolean;
  stompError: string | null;
  canSnapshot: boolean;
}

export function useInterviewerJavaSnapshots({
  idRoom,
  token,
  language,
  getCode,
  enabled,
}: UseInterviewerJavaSnapshotsParams): UseInterviewerJavaSnapshotsResult {
  const [isStompReady, setIsStompReady] = useState(false);
  const [stompError, setStompError] = useState<string | null>(null);

  const getCodeRef = useRef(getCode);
  const languageRef = useRef(language);
  const idRoomRef = useRef(idRoom);
  const clientRef = useRef<Client | null>(null);
  const userIdRef = useRef<number | null>(null);

  useEffect(() => {
    getCodeRef.current = getCode;
  }, [getCode]);

  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  useEffect(() => {
    idRoomRef.current = idRoom;
  }, [idRoom]);

  const userId = decodeJwtNumericUserId(token);
  const canSnapshot = userId !== null;
  const lastLengthRef = useRef<number>(0);

  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  const publishSnapshot = useCallback(() => {
    const client = clientRef.current;
    const uid = userIdRef.current;
    const room = idRoomRef.current;
    if (!client?.connected || uid === null) return;

    const code = getCodeRef.current();
    lastLengthRef.current = code.length;

    const body = JSON.stringify({
      idRoom: room,
      textCode: code,
      language: languageRef.current || '',
      idCandidate: null,
      idInterviewer: uid,
    });

    try {
      client.publish({ destination: STOMP_DESTINATION, body });
    } catch {
      setStompError('Не удалось отправить снимок');
    }
  }, []);

  useEffect(() => {
    if (!enabled || !token || !idRoom) {
      setIsStompReady(false);
      setStompError(null);
      return;
    }

    if (userId === null) {
      setIsStompReady(false);
      setStompError(null);
      return;
    }

    setStompError(null);

    const client = new Client({
      brokerURL: buildBrokerUrl(token),
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        setIsStompReady(true);
        setStompError(null);
      },
      onStompError: (frame) => {
        const msg = frame.headers.message ?? frame.body;
        setStompError(typeof msg === 'string' && msg.trim() ? msg : 'Ошибка STOMP');
        setIsStompReady(false);
      },
      onWebSocketError: () => {
        setStompError('Ошибка WebSocket (Java /ws)');
        setIsStompReady(false);
      },
      onDisconnect: () => {
        setIsStompReady(false);
      },
    });

    clientRef.current = client;
    client.activate();

    return () => {
      clientRef.current = null;
      client.deactivate();
    };
  }, [enabled, token, idRoom, userId]);

  useEffect(() => {
    if (!enabled || userId === null || !isStompReady) return;

    const id = window.setInterval(() => {
      publishSnapshot();
    }, INTERVIEWER_SNAPSHOT_INTERVAL_MS);

    return () => window.clearInterval(id);
  }, [enabled, userId, isStompReady, publishSnapshot]);

  const sendSnapshot = useCallback(() => {
    publishSnapshot();
  }, [publishSnapshot]);

  const checkLengthAndSnapshot = useCallback((len: number) => {
    const last = lastLengthRef.current;
    if (last === 0) {
      lastLengthRef.current = len;
      return;
    }
    if (len >= last * 2 || len <= last / 2) {
      publishSnapshot();
    }
  }, [publishSnapshot]);

  return {
    sendSnapshot,
    checkLengthAndSnapshot,
    isStompReady,
    stompError,
    canSnapshot,
  };
}
