'use client';
import Link from 'next/link';
import { activePublicHref } from '@/lib/public-navigation';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const navigation = [
  ['Inicio', '/'],
  ['Catálogo', '/catalogo'],
  ['Personalizables', '/catalogo?allowsCustomization=true'],
  ['Disponibles', '/catalogo?inStock=true']
] as const;
export function SiteHeader() {
  const pathname = usePathname();
  const search = useSearchParams();
  const activeHref = activePublicHref(pathname, search);
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLElement>(null);
  function navigateMobile() {
    setOpen(false);
  }
  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLAnchorElement>('a')?.focus();
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        toggle.current?.focus();
      }
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [open]);
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)');
    const resize = () => {
      if (desktop.matches) setOpen(false);
    };
    desktop.addEventListener('change', resize);
    return () => desktop.removeEventListener('change', resize);
  }, []);
  if (pathname === '/panel' || pathname.startsWith('/panel/')) return null;
  const links = (mobile: boolean) =>
    navigation.map(([label, href]) => (
      <Link
        key={href}
        href={href}
        onClick={mobile ? navigateMobile : undefined}
        className="site-nav-link"
        aria-current={activeHref === href ? 'page' : undefined}
      >
        {label}
      </Link>
    ));
  return (
    <header className="site-header">
      <div className="page-shell site-header-inner">
        <Link
          className="site-brand"
          href="/"
          aria-label="Home Fashion, inicio"
          onClick={() => setOpen(false)}
        >
          <span className="brand-monogram" aria-hidden="true">
            hf.
          </span>
          <span>
            Home Fashion<small>Muebles para hacer hogar</small>
          </span>
        </Link>
        <nav aria-label="Navegación principal" className="site-nav site-nav-desktop">
          {links(false)}
          <Link className="site-nav-link internal-link" href="/iniciar-sesion">
            Acceso interno
          </Link>
        </nav>
        <button
          ref={toggle}
          type="button"
          className="site-menu-toggle"
          aria-expanded={open}
          aria-controls="public-mobile-menu"
          onClick={() => setOpen((current) => !current)}
        >
          {open ? 'Cerrar ✕' : 'Menú ☰'}
        </button>
        {open && (
          <nav
            ref={menu}
            id="public-mobile-menu"
            aria-label="Navegación móvil"
            className="site-mobile-menu"
          >
            {links(true)}
            <Link
              href="/iniciar-sesion"
              className="site-nav-link internal-link"
              onClick={navigateMobile}
            >
              Acceso interno
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
