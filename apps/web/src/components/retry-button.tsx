'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

export function RetryButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      className="button-link"
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => router.refresh())}
    >
      {pending ? 'Consultando…' : 'Volver a intentar'}
    </button>
  );
}
