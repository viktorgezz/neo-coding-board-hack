/**
 * RatingPicker — five clickable circles (1–5) for assessment scoring.
 *
 * Uncontrolled internally — fully controlled by parent via value/onChange.
 * Used by VerdictModal for all four assessment dimensions.
 */

import styles from './RatingPicker.module.css';

const RATINGS = [1, 2, 3, 4, 5] as const;

export interface RatingPickerProps {
  value:    number;               // 0 = unset, 1-5 = selected
  onChange: (n: number) => void;
  label:    string;
}

export default function RatingPicker({ value, onChange, label }: RatingPickerProps) {
  return (
    <div>
      <div className={styles.circles} aria-label={label}>
        {RATINGS.map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${label}: ${n}`}
            aria-pressed={value === n}
            className={value === n ? styles.circleSelected : styles.circle}
            onClick={() => onChange(n)}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
