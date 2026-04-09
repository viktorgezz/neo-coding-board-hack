/**
 * Analytics & AI Engine — base URL for all analytics API calls.
 *
 * Dev: `/analytics-api` is proxied by Vite to the analytics service (see vite.config).
 * Prod: set `VITE_ANALYTICS_API_BASE_URL` to the full origin, e.g. http://111.88.127.60:8000
 */

export function getAnalyticsApiRoot(): string {
  const env = import.meta.env.VITE_ANALYTICS_API_BASE_URL as string | undefined;
  if (env && env.trim()) return env.trim().replace(/\/$/, '');
  return '/analytics-api';
}

/** Path must start with `/api/...`. */
export function analyticsApiUrl(path: string): string {
  const root = getAnalyticsApiRoot();
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${root}${p}`;
}
