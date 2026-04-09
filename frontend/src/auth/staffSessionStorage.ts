/**
 * Персистентность сессии сотрудника (interviewer / hr / admin) до явного Logout.
 * Токены не попадают в код в открытом виде — только в localStorage браузера.
 */

const KEY_ACCESS  = 'neo_staff_token_access';
const KEY_REFRESH = 'neo_staff_token_refresh';
const KEY_NAME    = 'neo_staff_user_name';

export function persistStaffSession(tokenAccess: string, tokenRefresh: string, name: string): void {
  try {
    localStorage.setItem(KEY_ACCESS, tokenAccess);
    localStorage.setItem(KEY_REFRESH, tokenRefresh);
    localStorage.setItem(KEY_NAME, name);
  } catch {
    // приватный режим / квота
  }
}

export function clearStaffSessionStorage(): void {
  try {
    localStorage.removeItem(KEY_ACCESS);
    localStorage.removeItem(KEY_REFRESH);
    localStorage.removeItem(KEY_NAME);
  } catch {
    /* ignore */
  }
}

export function readStaffSessionFromStorage(): {
  tokenAccess: string;
  tokenRefresh: string;
  name: string;
} | null {
  if (typeof window === 'undefined') return null;
  try {
    const tokenAccess = localStorage.getItem(KEY_ACCESS);
    const tokenRefresh = localStorage.getItem(KEY_REFRESH) ?? '';
    const name = localStorage.getItem(KEY_NAME) ?? '';
    if (!tokenAccess) return null;
    return { tokenAccess, tokenRefresh, name };
  } catch {
    return null;
  }
}
