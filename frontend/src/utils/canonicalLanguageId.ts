import { SUPPORTED_LANGUAGES } from '@/components/LanguageSelector';

/** Maps peer/API casing (e.g. `python`) to LanguageSelector `value` (e.g. `Python`). */
export function canonicalizeLanguageId(rough: string): string {
  const t = rough.trim();
  const found = SUPPORTED_LANGUAGES.find(
    (l) => l.value.toLowerCase() === t.toLowerCase(),
  );
  return found?.value ?? t;
}
