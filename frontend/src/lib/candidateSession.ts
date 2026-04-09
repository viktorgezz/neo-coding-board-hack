/**
 * Re-export shim — canonical location is src/auth/candidateSession.ts.
 * This file exists only for backward compatibility with any imports created
 * before the auth/ layout was established. New code must import from
 * src/auth/candidateSession.ts directly.
 */
export {
  setCandidateSession,
  getCandidateToken,
  getCandidateRoomId,
  clearCandidateSession,
} from '@/auth/candidateSession';
