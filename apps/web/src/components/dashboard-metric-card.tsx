import Link from 'next/link';

/** Visual accent only; values always come from the operations overview API. */
export type MetricTone = 'primary' | 'accent' | 'highlight' | 'success' | 'neutral';
export function DashboardMetricCard({
  label,
  value,
  href,
  detail,
  tone = 'neutral'
}: {
  label: string;
  value: string | number;
  href: string;
  detail?: string;
  tone?: MetricTone;
}) {
  return (
    <Link
      className={`dashboard-metric dashboard-metric-tone-${tone}${typeof value === 'string' ? ' dashboard-metric-wide' : ''}`}
      href={href}
    >
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
      <span className="text-link">Ver →</span>
    </Link>
  );
}
