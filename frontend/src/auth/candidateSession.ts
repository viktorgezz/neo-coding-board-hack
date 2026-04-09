/**
 * Candidate session — completely separate from the main auth store.
 *
 * Candidates never go through /login. Their tokenAccess is issued by
 * POST /rooms/register/:id and is only needed for WS connection inside
 * CandidateEditorPage. It is stored here as module-level variables
 * (memory only — no localStorage, no sessionStorage, no Zustand, no cookie).
 *
 * Intentionally NOT a React store or context. Candidate pages import these
 * plain functions directly so there is zero coupling with the auth layer
 * used by internal users (interviewer / hr / admin).
 *
 * Separation is enforced at the import level:
 *   - Internal pages  → src/auth/useAuth.ts (AuthContext, Zustand)
 *   - Candidate pages → src/auth/candidateSession.ts  ← this file
 */

let _candidateToken: string | null = null;
let _candidateRoomId: string | null = null;

/**
 * Store the token and room ID after successful POST /rooms/register/:id.
 * Called by CandidateJoinPage immediately before navigating to the editor.
 */
export function setCandidateSession(token: string, roomId: string): void {
  _candidateToken = token;
  _candidateRoomId = roomId;
}

/** Used by CandidateEditorPage to attach the token to the WebSocket connection. */
export function getCandidateToken(): string | null {
  return _candidateToken;
}

/** Used by CandidateEditorPage to identify which room's WS to connect to. */
export function getCandidateRoomId(): string | null {
  return _candidateRoomId;
}

/** Called when the candidate navigates away or the session ends. */
export function clearCandidateSession(): void {
  _candidateToken = null;
  _candidateRoomId = null;
}
