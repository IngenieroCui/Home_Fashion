import type { ReactNode } from 'react';
export function StatusBadge({
  children,
  tone = 'info',
  className = ''
}: {
  children: ReactNode;
  tone?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  className?: string;
}) {
  return (
    <span className={`admin-status ui-status ui-status-${tone} ${className}`}>{children}</span>
  );
}
