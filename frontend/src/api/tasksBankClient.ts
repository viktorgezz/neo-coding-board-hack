/**
 * Tasks Bank Service — base URL for category/task APIs (NotesPanel, TaskBankManagePage).
 * Empty `VITE_TASKS_BANK_API_BASE_URL` must fall back: otherwise axios treats `/api/v1/...`
 * as same-origin under `/` and hits the Java API (wrong service).
 */

export function getTasksBankApiRoot(): string {
  const env = import.meta.env.VITE_TASKS_BANK_API_BASE_URL as string | undefined;
  if (env && env.trim()) return env.trim().replace(/\/$/, '');
  return '/tasks-api';
}
