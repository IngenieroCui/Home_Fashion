'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function SiteHeader() {
  const pathname = usePathname();
  if (pathname === '/panel' || pathname.startsWith('/panel/')) return null;
  return (
    <header className="site-header">
      <div className="page-shell site-header-inner">
        <Link className="site-brand" href="/" aria-label="Home Fashion, inicio">
          <span className="brand-monogram" aria-hidden="true">
            hf.
          </span>
          <span>
            Home Fashion<small>Muebles para hacer hogar</small>
          </span>
        </Link>
        <nav aria-label="Navegación principal" className="site-nav">
          <Link
            className="site-nav-link"
            aria-current={pathname === '/iniciar-sesion' ? 'page' : undefined}
            href="/iniciar-sesion"
          >
            Acceso interno
          </Link>
          <Link
            className="button-link button-link-secondary"
            aria-current={pathname.startsWith('/catalogo') ? 'page' : undefined}
            href="/catalogo"
          >
            Explorar catálogo
          </Link>
        </nav>
      </div>
    </header>
  );
}
