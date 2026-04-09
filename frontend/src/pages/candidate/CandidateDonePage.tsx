/**
 * CandidateDonePage — /session/:id/done
 *
 * Public. No token needed. No verdict displayed — by design.
 * Shows only the completion message mandated by the spec.
 */
export default function CandidateDonePage() {
  return (
    <div>
      <p>Интервью окончено! Спасибо за уделённое время!</p>
    </div>
  );
}
