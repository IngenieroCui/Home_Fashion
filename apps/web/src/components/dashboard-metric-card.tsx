import Link from 'next/link';
export function DashboardMetricCard({
  label,
  value,
  href,
  detail
}: {
  label: string;
  value: string | number;
  href: string;
  detail?: string;
}) {
  return (
    <Link className={`dashboard-metric${typeof value === 'string' ? ' dashboard-metric-wide' : ''}`} href={href}>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
      <span className="text-link">Ver →</span>
    </Link>
  );
}
