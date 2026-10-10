import Link from 'next/link';
import type { AttentionItem } from '@/lib/operations';
export function DashboardAttentionCard({
  title,
  count,
  items,
  href,
  itemHref
}: {
  title: string;
  count: number;
  items: AttentionItem[];
  href: string;
  itemHref: (id: string) => string;
}) {
  return (
    <section className="admin-section attention-feed">
      <div className="record-card-header">
        <h3>{title}</h3>
        <span className="admin-status">{count}</span>
      </div>
      {items.length ? (
        <ul className="attention-preview">
          {items.map((item) => (
            <li key={item.id}>
              <Link href={itemHref(item.id)}>
                <span>
                  {item.code}
                  {item.customerName && <small>{item.customerName}</small>}
                  {item.scheduledDate && <small>{item.scheduledDate}</small>}
                </span>
                <span>Ver →</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="notice mt-4">Todo al día en esta sección.</p>
      )}
      <Link className="text-link mt-4 inline-block" href={href}>
        Abrir módulo →
      </Link>
    </section>
  );
}
