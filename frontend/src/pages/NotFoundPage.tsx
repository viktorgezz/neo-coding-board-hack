/**
 * NotFoundPage — catches all unmatched paths ("*")
 */
import BackLink from '@/components/BackLink';
import BackButton from '@/components/BackButton';

export default function NotFoundPage() {
  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <p>404 — страница не найдена</p>
      <BackLink to="/">На главную</BackLink>
      <div style={{ marginTop: 12 }}>
        <BackButton label="Предыдущая страница" />
      </div>
    </div>
  );
}
