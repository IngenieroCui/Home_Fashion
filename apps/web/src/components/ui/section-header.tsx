import type { ReactNode } from 'react';
export function SectionHeader({
  title,
  id,
  description,
  action
}: {
  title: string;
  id?: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        <h2 id={id} className="font-serif text-2xl">
          {title}
        </h2>
        {description && <div>{description}</div>}
      </div>
      {action}
    </div>
  );
}
