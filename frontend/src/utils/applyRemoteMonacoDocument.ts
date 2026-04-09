import type { MutableRefObject } from 'react';

/**
 * Applies a peer's full document without the harsher side effects of setValue:
 * uses executeEdits (single full-model replace), preserves scroll, maps the
 * local caret by UTF-16 offset (stable when both sides edit similar text).
 */

type EditorLike = {
  getModel: () => {
    getValue: () => string;
    getFullModelRange: () => {
      startLineNumber: number;
      startColumn: number;
      endLineNumber: number;
      endColumn: number;
    };
    getOffsetAt: (pos: { lineNumber: number; column: number }) => number;
    /** Monaco ITextModel — maps UTF-16 offset → line/column */
    getPositionAt: (offset: number) => { lineNumber: number; column: number };
    getLineCount: () => number;
    getLineMaxColumn: (lineNumber: number) => number;
  } | null;
  getPosition: () => { lineNumber: number; column: number } | null;
  getScrollTop: () => number;
  getScrollLeft: () => number;
  setScrollTop: (top: number) => void;
  setScrollLeft: (left: number) => void;
  setPosition: (pos: { lineNumber: number; column: number }) => void;
  executeEdits: (
    source: string,
    edits: Array<{
      range: {
        startLineNumber: number;
        startColumn: number;
        endLineNumber: number;
        endColumn: number;
      };
      text: string;
      forceMoveMarkers?: boolean;
    }>,
  ) => boolean;
};

/**
 * @returns true when the buffer changed
 */
export function applyRemoteMonacoDocument(editor: EditorLike, newText: string): boolean {
  const model = editor.getModel();
  if (!model) return false;

  const oldText = model.getValue();
  if (oldText === newText) return false;

  const pos = editor.getPosition();
  const offset = pos ? model.getOffsetAt(pos) : 0;
  const scrollTop = editor.getScrollTop();
  const scrollLeft = editor.getScrollLeft();

  editor.executeEdits('neo-remote-peer', [
    {
      range: model.getFullModelRange(),
      text: newText,
      forceMoveMarkers: true,
    },
  ]);

  const newLen = newText.length;
  const mapped = Math.min(Math.max(0, offset), newLen);
  const newPos = model.getPositionAt(mapped);
  const line = Math.min(Math.max(1, newPos.lineNumber), model.getLineCount());
  const col = Math.min(Math.max(1, newPos.column), model.getLineMaxColumn(line));
  editor.setPosition({ lineNumber: line, column: col });

  editor.setScrollTop(scrollTop);
  editor.setScrollLeft(scrollLeft);
  return true;
}

/**
 * Runs a remote document apply and keeps suppressRef true until after Monaco
 * and @monaco-editor/react have finished emitting content callbacks (avoids
 * echoing the peer document back over the wire).
 */
export function runRemoteDocumentApply(
  suppressOutboundRef: MutableRefObject<boolean>,
  fn: () => void,
): void {
  suppressOutboundRef.current = true;
  try {
    fn();
  } finally {
    queueMicrotask(() => {
      queueMicrotask(() => {
        suppressOutboundRef.current = false;
      });
    });
  }
}
