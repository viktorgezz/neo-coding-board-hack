/**
 * Full-document sync + debounced send creates races: a peer message can
 * overwrite the editor while local keystrokes are not yet on the server.
 * We defer applying remote text until the local editor has been idle briefly.
 */

/** Min ms since last local keystroke before we may replace the model from WS */
export const LOCAL_EDIT_GUARD_MS = 120;

/** Retry scheduling when waiting for local idle */
export const REMOTE_APPLY_RETRY_MS = 45;
