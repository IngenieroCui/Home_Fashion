import Link from 'next/link';
import { PageState } from '@/components/page-state';

export default function NotFound() {
  return (
    <main className="page-shell py-12">
      <PageState
        title="Esta página no está disponible"
        action={
          <Link className="button-link" href="/catalogo">
            Explorar el catálogo
          </Link>
        }
      >
        <p>
          El enlace puede haber cambiado. Puedes seguir descubriendo muebles desde nuestro catálogo.
        </p>
      </PageState>
    </main>
  );
}
