/**
 * POST session history to Analytics after interview ends.
 * Pulls code snapshots + notes from core API, maps to Analytics SessionHistory schema.
 */

import { analyticsApiUrl } from './analyticsClient';

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

/**
 * Best-effort: never throws. Core + analytics calls are fire-and-forget safe for UX.
 */
export async function pushSessionHistoryToAnalytics(
  idRoom: string,
  staffToken: string,
): Promise<void> {
  const headers = { Authorization: `Bearer ${staffToken}` };

  try {
    const [snapRes, notesRes] = await Promise.all([
      fetch(`/api/v1/rooms/${idRoom}/code/snapshots`, { headers }),
      fetch(`/api/v1/rooms/${idRoom}/notes/paged?page=0&size=200`, { headers }),
    ]);

    const codeSnapshots: { timestamp: string; code: string; language: string }[] = [];
    if (snapRes.ok) {
      const data: unknown = await snapRes.json();
      const list = isRecord(data) && Array.isArray(data.content) ? data.content : [];
      for (const item of list) {
        if (!isRecord(item)) continue;
        const ts = item.timeCreated;
        codeSnapshots.push({
          timestamp: typeof ts === 'string' ? ts : new Date().toISOString(),
          code: String(item.textCode ?? item.textContent ?? ''),
          language: String(item.language ?? item.idLanguage ?? 'plaintext'),
        });
      }
    }

    const interviewerNotes: { timestamp: string; text: string }[] = [];
    if (notesRes.ok) {
      const data: unknown = await notesRes.json();
      const list =
        isRecord(data) && Array.isArray(data.content)
          ? data.content
          : isRecord(data) && Array.isArray(data.listNotes)
            ? data.listNotes
            : [];
      for (const item of list) {
        if (!isRecord(item)) continue;
        const ts = item.timeCreated;
        interviewerNotes.push({
          timestamp: typeof ts === 'string' ? ts : new Date().toISOString(),
          text: String(item.textContent ?? item.text ?? ''),
        });
      }
    }

    const endTime = new Date().toISOString();
    const startTime =
      codeSnapshots[0]?.timestamp
      ?? interviewerNotes[0]?.timestamp
      ?? endTime;

    await fetch(analyticsApiUrl(`/api/v1/rooms/${idRoom}/history`), {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization:  `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        startTime,
        endTime,
        codeSnapshots,
        interviewerNotes,
      }),
    });
  } catch {
    // swallow — room already finished; history is supplementary
  }
}
