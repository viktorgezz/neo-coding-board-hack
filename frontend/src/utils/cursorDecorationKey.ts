import type { CursorOutMessage } from '@/hooks/useCursorSocket';

/** Stable key for cursor + selection — avoids skipping updates when only column changes. */
export function cursorDecorationKey(cursor: CursorOutMessage | null | undefined): string {
  if (!cursor) return 'none';
  const {
    line, column,
    selStartLine, selStartCol, selEndLine, selEndCol,
  } = cursor;
  return [
    line,
    column,
    selStartLine ?? '',
    selStartCol ?? '',
    selEndLine ?? '',
    selEndCol ?? '',
  ].join(':');
}
