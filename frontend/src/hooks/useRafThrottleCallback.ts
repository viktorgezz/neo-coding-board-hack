import { useCallback, useRef } from 'react';

/**
 * Coalesces high-frequency callbacks (e.g. cursor moves) to at most once per frame.
 */
export function useRafThrottleCallback<A extends unknown[]>(
  fn: (...args: A) => void,
): (...args: A) => void {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const rafRef = useRef<number | null>(null);
  const lastArgsRef = useRef<A | null>(null);

  return useCallback((...args: A) => {
    lastArgsRef.current = args;
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const a = lastArgsRef.current;
      if (a) fnRef.current(...a);
    });
  }, []);
}
