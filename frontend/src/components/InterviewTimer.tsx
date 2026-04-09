/**
 * InterviewTimer — counts up from 00:00, updates every second.
 *
 * Self-contained: owns its own interval, cleans it up on unmount.
 * Receives startTime (Date.now() at session mount) and never re-derives
 * it from props — startTime is expected to be stable, set once.
 *
 * Memoized: the parent's re-renders (e.g. language change) will not cause
 * this component to re-render because startTime never changes.
 */

import { memo, useState, useEffect } from 'react';

interface InterviewTimerProps {
  /** Date.now() captured when the candidate editor page mounted. */
  startTime: number;
}

function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

const InterviewTimer = memo(function InterviewTimer({ startTime }: InterviewTimerProps) {
  const [elapsed, setElapsed] = useState(() =>
    Math.floor((Date.now() - startTime) / 1000),
  );

  useEffect(() => {
    const id = setInterval(() => {
      // Derive from startTime on every tick — no accumulated drift from setInterval
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(id);
  }, [startTime]);

  return (
    <span
      style={{
        fontFamily: "'Courier New', Courier, monospace",
        fontVariantNumeric: 'tabular-nums',
        fontSize: '13px',
        color: '#7B9EA6',
        flexShrink: 0,
        userSelect: 'none',
        background: 'rgba(255,255,255,0.06)',
        padding: '6px 16px',
        borderRadius: '6px',
      }}
    >
      {formatElapsed(elapsed)}
    </span>
  );
});

export default InterviewTimer;
