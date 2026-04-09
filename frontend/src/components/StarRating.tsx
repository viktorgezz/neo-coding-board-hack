/**
 * StarRating — five-star criterion scorer.
 *
 * Hover preview: moving the mouse over star N fills stars 1..N immediately
 * (hoverValue local state). Mouse leave reverts display to the committed value.
 * Click commits the hovered value by calling onChange(n).
 *
 * Stars use Unicode ★ (U+2605) filled and ☆ (U+2606) empty — no SVG, no icon lib.
 * Keyboard accessible: each star is a <button>, Tab navigates, Space/Enter commits.
 *
 * React.memo: re-renders only when `value` or `onChange` reference changes.
 * hoverValue is local state — parent is never notified of hover events.
 */

import { memo, useState } from 'react';
import styles from './StarRating.module.css';

export interface StarRatingProps {
  value:    number;               // 0 = no stars filled, 1-5 = rated
  onChange: (n: number) => void;
  label:    string;
}

const STARS = [1, 2, 3, 4, 5] as const;

const StarRating = memo(function StarRating({ value, onChange, label }: StarRatingProps) {
  // Local hover state — does not propagate to parent
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  // displayValue drives the visual state: hover preview takes precedence
  const displayValue = hoverValue ?? value;

  return (
    <div className={styles.row}>
      <span className={styles.label}>{label}</span>

      {/* onMouseLeave on the container resets hover when the user exits all stars */}
      <div
        className={styles.stars}
        onMouseLeave={() => setHoverValue(null)}
      >
        {STARS.map((n) => {
          const isFilled = n <= displayValue;
          return (
            <button
              key={n}
              type="button"
              className={`${styles.starBtn} ${isFilled ? styles.starFilled : styles.starEmpty}`}
              onMouseEnter={() => setHoverValue(n)}
              onClick={() => onChange(n)}
              aria-label={`${n} из 5`}
              aria-pressed={value === n}
            >
              {isFilled ? '★' : '☆'}
            </button>
          );
        })}
      </div>
    </div>
  );
});

export default StarRating;
