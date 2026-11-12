import { formatDateTime } from '@/lib/formatters';
import Link from 'next/link';
import type { Activity } from '@/lib/operations';
export function DashboardActivity({ items }: { items: Activity[] }) {
  return (
    <section className="admin-section">
      <h2 className="font-serif text-2xl">Actividad reciente</h2>
      {items.length ? (
        <ol className="operation-timeline">
          {items.map((item) => (
            <li key={`${item.kind}-${item.id}`}>
              <Link className="text-link" href={item.href}>
                {item.code || item.kind}
              </Link>
              <strong>{item.title}</strong>
              {item.subtitle && <p>{item.subtitle}</p>}
              <time dateTime={item.occurredAt}>{formatDateTime(item.occurredAt)}</time>
            </li>
          ))}
        </ol>
      ) : (
        <p className="notice mt-4">La actividad de tus módulos aparecerá aquí.</p>
      )}
    </section>
  );
}
