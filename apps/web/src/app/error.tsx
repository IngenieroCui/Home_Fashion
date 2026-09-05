'use client';

import Link from 'next/link';
import { PageState } from '@/components/page-state';

export default function ErrorPage({
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="page-shell py-12">
      <PageState
        title="No pudimos abrir esta página"
        tone="error"
        action={
          <>
            <button className="button-link" onClick={reset} type="button">
              Volver a intentar
            </button>
            <Link className="button-link button-link-secondary" href="/">
              Ir al inicio
            </Link>
          </>
        }
      >
        <p>
          Ocurrió un problema al cargar la información. Espera un momento y vuelve a intentarlo.
        </p>
      </PageState>
    </div>
  );
}
