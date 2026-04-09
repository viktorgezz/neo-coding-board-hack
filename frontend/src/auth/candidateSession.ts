/**
 * Candidate session — отдельно от сотрудников (/login).
 * Токен после регистрации дублируется в sessionStorage: F5 на редакторе
 * не сбрасывает сессию, пока вкладка открыта. Явный clear — /done и т.п.
 */

const STORAGE_KEY = 'neo_candidate_session_v1';

let _candidateToken:   string | null = null;
let _candidateRoomId:  string | null = null;
let _candidateVacancy: string | null = null;

function persistToSessionStorage(): void {
  if (!_candidateToken || !_candidateRoomId) return;
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        token:   _candidateToken,
        roomId:  _candidateRoomId,
        vacancy: _candidateVacancy,
      }),
    );
  } catch {
    /* quota / private mode */
  }
}

/**
 * Восстанавливает сессию из sessionStorage, если roomId совпадает с URL.
 * Вызывать до getCandidateToken() на странице редактора.
 */
export function restoreCandidateSessionFromStorage(urlRoomId: string): void {
  if (!urlRoomId) return;

  if (_candidateToken && _candidateRoomId === urlRoomId) return;

  if (_candidateToken && _candidateRoomId !== urlRoomId) {
    clearCandidateSession();
  }

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const o = JSON.parse(raw) as { token?: string; roomId?: string; vacancy?: string | null };
    if (!o.token || !o.roomId || o.roomId !== urlRoomId) return;
    _candidateToken   = o.token;
    _candidateRoomId  = o.roomId;
    _candidateVacancy = o.vacancy ?? null;
  } catch {
    /* ignore */
  }
}

export function setCandidateSession(
  token:    string,
  roomId:   string,
  vacancy?: string,
): void {
  _candidateToken   = token;
  _candidateRoomId  = roomId;
  _candidateVacancy = vacancy ?? null;
  persistToSessionStorage();
}

export function getCandidateToken(): string | null {
  return _candidateToken;
}

export function getCandidateRoomId(): string | null {
  return _candidateRoomId;
}

export function getCandidateVacancy(): string | null {
  return _candidateVacancy;
}

export function clearCandidateSession(): void {
  _candidateToken   = null;
  _candidateRoomId  = null;
  _candidateVacancy = null;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
