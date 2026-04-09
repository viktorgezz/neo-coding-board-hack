/**
 * Exhaustive role registry. Reference these constants everywhere — never
 * inline the raw strings 'interviewer' | 'hr' | 'admin' | 'candidate'.
 *
 * Candidate is intentionally excluded from the AuthState role union because
 * candidates authenticate through a separate candidateSession module and
 * never touch the main auth store.
 */
export const ROLES = {
  INTERVIEWER: 'interviewer',
  HR: 'hr',
  ADMIN: 'admin',
  /** Candidate has no login flow — token comes from POST /rooms/register/:id */
  CANDIDATE: 'candidate',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];
export type AuthRole = Exclude<Role, 'candidate'>;
