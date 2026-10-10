'use client';
import { useState } from 'react';
import { quoteStatusLabel, type QuoteStatus } from '@/lib/customer-quote-utils';

export function QuoteStateActions({
  statuses,
  onChange
}: {
  statuses: QuoteStatus[];
  onChange: (status: QuoteStatus) => Promise<void>;
}) {
  const [pending, setPending] = useState(false);
  if (!statuses.length) return null;
  return (
    <section className="admin-section">
      <h2 className="font-serif text-2xl">Cambiar estado</h2>
      <div className="admin-actions">
        {statuses.map((status) => (
          <button
            type="button"
            className="button-link button-link-secondary"
            key={status}
            disabled={pending}
            aria-busy={pending}
            onClick={async () => {
              setPending(true);
              try {
                await onChange(status);
              } finally {
                setPending(false);
              }
            }}
          >
            {quoteStatusLabel[status]}
          </button>
        ))}
      </div>
    </section>
  );
}
