/**
 * Shared full-document sync from WSCodeService: idle-guard, version-safe apply,
 * peer language propagation, and seeding the outbound buffer after remote edits.
 */

import { useEffect, useRef, type MutableRefObject, type RefObject } from 'react';
import type { LiveCodeState } from '@/hooks/useWebSocket';
import { applyRemoteMonacoDocument, runRemoteDocumentApply } from '@/utils/applyRemoteMonacoDocument';
import { canonicalizeLanguageId } from '@/utils/canonicalLanguageId';
import { LOCAL_EDIT_GUARD_MS, REMOTE_APPLY_RETRY_MS } from '@/utils/collabEditGuards';

type MinimalEditor = Parameters<typeof applyRemoteMonacoDocument>[0];

export interface UseRoomCodeSyncParams {
  liveCode:               LiveCodeState | null;
  editorRef:              RefObject<MinimalEditor | null>;
  /** When set, updates Monaco tokenizer after remote text/language. */
  monacoRef?:             RefObject<{ editor: { setModelLanguage: (m: unknown, lang: string) => void } } | null>;
  languageRef:            RefObject<string>;
  onPeerLanguage:         (canonicalLang: string) => void;
  skipNextLanguageSendRef: MutableRefObject<boolean>;
  lastLocalEditAtRef:     MutableRefObject<number>;
  blurTick:               number;
  seedLatestText:         (text: string) => void;
  suppressOutboundRef:    MutableRefObject<boolean>;
  toMonacoLanguage:       (idLanguage: string) => string;
  /** Call after remote buffer replaced peer text — clears stale peer cursor coordinates. */
  invalidatePeerCursor?:  () => void;
}

/**
 * Applies `liveCode` from the peer when the editor is idle, updates language,
 * and keeps `latestTextRef` (via seedLatestText) aligned with the buffer.
 */
export function useRoomCodeSync({
  liveCode,
  editorRef,
  monacoRef,
  languageRef,
  onPeerLanguage,
  skipNextLanguageSendRef,
  lastLocalEditAtRef,
  blurTick,
  seedLatestText,
  suppressOutboundRef,
  toMonacoLanguage,
  invalidatePeerCursor,
}: UseRoomCodeSyncParams): void {
  const remoteApplyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (remoteApplyTimerRef.current) {
        clearTimeout(remoteApplyTimerRef.current);
        remoteApplyTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (liveCode === null) return;

    const clearTimer = () => {
      if (remoteApplyTimerRef.current) {
        clearTimeout(remoteApplyTimerRef.current);
        remoteApplyTimerRef.current = null;
      }
    };

    const applyLanguageToModel = (canonicalLang: string) => {
      const editor = editorRef.current;
      const monaco = monacoRef?.current;
      if (!editor || !monaco) return;
      const model = editor.getModel();
      if (model) {
        monaco.editor.setModelLanguage(model, toMonacoLanguage(canonicalLang));
      }
    };

    const runApply = () => {
      const editor = editorRef.current;
      if (!editor) {
        remoteApplyTimerRef.current = setTimeout(runApply, REMOTE_APPLY_RETRY_MS);
        return;
      }
      const idle = Date.now() - (lastLocalEditAtRef.current ?? 0);
      if (idle < LOCAL_EDIT_GUARD_MS) {
        remoteApplyTimerRef.current = setTimeout(runApply, REMOTE_APPLY_RETRY_MS);
        return;
      }

      const canonicalLang = canonicalizeLanguageId(liveCode.idLanguage);
      const curLang = languageRef.current ?? '';
      if (canonicalLang.toLowerCase() !== curLang.toLowerCase()) {
        skipNextLanguageSendRef.current = true;
        onPeerLanguage(canonicalLang);
      }

      const remoteText = liveCode.textContent;
      const localText = editor.getModel()?.getValue() ?? '';
      if (localText === remoteText) {
        applyLanguageToModel(canonicalLang);
        seedLatestText(remoteText);
        return;
      }

      let replaced = false;
      runRemoteDocumentApply(suppressOutboundRef, () => {
        replaced = applyRemoteMonacoDocument(editor, remoteText);
      });
      applyLanguageToModel(canonicalLang);
      seedLatestText(editor.getModel()?.getValue() ?? remoteText);
      if (replaced) {
        invalidatePeerCursor?.();
      }
    };

    clearTimer();
    remoteApplyTimerRef.current = setTimeout(runApply, 0);

    return clearTimer;
  }, [
    liveCode,
    blurTick,
    editorRef,
    monacoRef,
    languageRef,
    onPeerLanguage,
    skipNextLanguageSendRef,
    lastLocalEditAtRef,
    seedLatestText,
    suppressOutboundRef,
    toMonacoLanguage,
    invalidatePeerCursor,
  ]);
}
