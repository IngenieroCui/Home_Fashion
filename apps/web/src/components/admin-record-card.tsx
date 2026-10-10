import type { ReactNode } from 'react';
export function AdminRecordCard({
  title,
  subtitle,
  badge,
  children,
  actions
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <article className="admin-record-card">
      <div className="record-card-header">
        <div>
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {badge}
      </div>
      {children && <div className="record-card-body">{children}</div>}
      {actions && <div className="admin-actions">{actions}</div>}
    </article>
  );
}
export function AdminSkeleton({ label = 'Cargando información' }: { label?: string }) {
  return (
    <div className="admin-skeleton" role="status" aria-label={label} aria-busy="true">
      <span />
      <span />
      <span />
    </div>
  );
}
