import type { ReactNode } from 'react';
export function PageHeader({
  title,
  eyebrow,
  description,
  action
}: {
  title: string;
  eyebrow?: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="admin-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="font-serif text-4xl">{title}</h1>
        {description && <div>{description}</div>}
      </div>
      {action}
    </header>
  );
}
