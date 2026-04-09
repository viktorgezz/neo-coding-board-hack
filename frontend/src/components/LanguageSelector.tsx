/**
 * LanguageSelector — controlled select for Monaco language mode.
 *
 * Changing the language does NOT reset editor content — Monaco re-tokenises
 * in place when the language prop on MonacoEditor changes.
 *
 * Memoized: only re-renders when `value` changes (language switch).
 */

import { memo } from 'react';
import styles from './LanguageSelector.module.css';

export const SUPPORTED_LANGUAGES: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'kotlin',     label: 'Kotlin'     },
  { id: 'java',       label: 'Java'       },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'python',     label: 'Python'     },
  { id: 'go',         label: 'Go'         },
];

export interface LanguageSelectorProps {
  value:    string;
  onChange: (lang: string) => void;
}

const LanguageSelector = memo(function LanguageSelector({
  value,
  onChange,
}: LanguageSelectorProps) {
  return (
    <select
      className={styles.select}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Programming language"
    >
      {SUPPORTED_LANGUAGES.map((lang) => (
        <option key={lang.id} value={lang.id}>
          {lang.label}
        </option>
      ))}
    </select>
  );
});

export default LanguageSelector;
