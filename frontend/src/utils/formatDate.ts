/**
 * formatDate — shared ISO date-time → Russian short date + time formatter.
 *
 * Output example: "08 апр., 17:59"
 * Uses Intl.DateTimeFormat('ru-RU') — no third-party library.
 * Returns '—' for invalid date strings.
 *
 * Imported by SessionRow (interviewer list) and CandidateRow (HR list).
 */
export function formatDate(isoString: string): string {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('ru-RU', {
    day:    '2-digit',
    month:  'short',
    hour:   '2-digit',
    minute: '2-digit',
  }).format(date);
}
