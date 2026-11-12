'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function SiteFooter() {
  const pathname = usePathname();
  if (pathname === '/panel' || pathname.startsWith('/panel/')) return null;
  return (
    <footer className="site-footer">
      <div className="page-shell site-footer-grid">
        <div>
          <span className="font-serif text-2xl">Home Fashion</span>
          <p className="mt-2">Muebles para hacer hogar.</p>
        </div>
        <nav aria-label="Explorar"><strong>Explora</strong><Link href="/catalogo">Catálogo</Link><Link href="/catalogo?allowsCustomization=true">Personalizables</Link><Link href="/catalogo?inStock=true">Disponibles</Link></nav>
        <nav aria-label="Home Fashion"><strong>Home Fashion</strong><Link href="/">Inicio</Link><Link href="/iniciar-sesion">Acceso al equipo</Link><span>Seguimiento mediante enlace privado de tu pedido</span></nav>
        <div><strong>Conversemos</strong><p>Encuentra una pieza para tu hogar y solicita una cotización desde su ficha.</p><span>Ibagué, Colombia</span></div>
      </div>
    </footer>
  );
}
