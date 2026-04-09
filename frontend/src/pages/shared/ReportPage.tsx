/**
 * ReportPage — shared between:
 *   /interviewer/sessions/:id/report  (InterviewerRoute)
 *   /hr/candidates/:id/report         (HRRoute)
 *
 * Stub: replace with real implementation.
 */
import { useParams } from 'react-router-dom';

export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  return <div>ReportPage — id {id} — replace with real report</div>;
}
