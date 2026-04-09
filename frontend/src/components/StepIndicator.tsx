/**
 * StepIndicator — two-circle linear step tracker for VerdictModal.
 *
 * Renders: ○ ── ○
 * Circle 1: active (purple) on step 1, completed (green tint) on step 2.
 * Circle 2: future (gray)   on step 1, active   (purple)      on step 2.
 * Connector: gray on step 1, purple on step 2.
 *
 * React.memo: re-renders only when currentStep changes (once per session).
 */

import { memo } from 'react';
import styles from './StepIndicator.module.css';

export interface StepIndicatorProps {
  currentStep: 1 | 2;
}

const StepIndicator = memo(function StepIndicator({ currentStep }: StepIndicatorProps) {
  const circle1Class =
    currentStep === 1 ? styles.circleActive : styles.circleCompleted;

  const circle2Class =
    currentStep === 2 ? styles.circleActive : styles.circleFuture;

  const lineClass =
    currentStep === 2 ? styles.lineActive : styles.lineInactive;

  return (
    <div className={styles.root} aria-hidden="true">
      <div className={`${styles.circle} ${circle1Class}`}>1</div>
      <div className={`${styles.line} ${lineClass}`} />
      <div className={`${styles.circle} ${circle2Class}`}>2</div>
    </div>
  );
});

export default StepIndicator;
