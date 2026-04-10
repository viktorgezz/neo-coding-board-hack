/**
 * fetch для staff → core API: Bearer из замыкания + при 401 один раз refresh и повтор.
 * Зависимости задаёт AuthProvider через bindStaffFetchDeps (без циклического импорта с AuthContext).
 */

let getToken: () => string | null = () => null;
let runRefresh: (() => Promise<boolean>) | null = null;

export function bindStaffFetchDeps(
  tokenGetter: () => string | null,
  refresh: () => Promise<boolean>,
): void {
  getToken = tokenGetter;
  runRefresh = refresh;
}

export async function staffAuthedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const doFetch = async (): Promise<Response> => {
    const headers = new Headers(init.headers ?? undefined);
    const token = getToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return fetch(input, { ...init, headers });
  };

  let res = await doFetch();
  if (res.status !== 401 || !runRefresh) return res;

  const ok = await runRefresh();
  if (!ok) return res;

  return doFetch();
}
