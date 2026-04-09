/**
 * CandidateDonePage — /session/:id/done
 *
 * Public. No token needed. No verdict displayed — by design.
 * Shows only the completion message mandated by the spec.
 */
import { useEffect } from 'react';

import { clearCandidateSession } from '@/auth/candidateSession';

export default function CandidateDonePage() {
  useEffect(() => {
    clearCandidateSession();
  }, []);

  return (
    <div>
      <p>Интервью окончено! Спасибо за уделённое время!</p>
    </div>
  );
}
