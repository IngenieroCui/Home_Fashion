'use client';

import Link from 'next/link';
import { PageState } from '@/components/page-state';

export default function PanelError({
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PageState
      title="No pudimos abrir este módulo"
      tone="error"
      action={
        <>
          <button className="button-link" type="button" onClick={reset}>
            Volver a intentar
          </button>
          <Link className="button-link button-link-secondary" href="/panel">
            Volver al panel
          </Link>
        </>
      }
    >
      <p>La información no pudo cargarse. Inténtalo nuevamente en un momento.</p>
    </PageState>
  );
}
