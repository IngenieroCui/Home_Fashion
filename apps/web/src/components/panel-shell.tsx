'use client';
import { clientFetch } from '@/lib/client-fetch';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import type { MeResponse } from '@/lib/auth/types';
import { BrandMark } from './ui/brand-mark';

const modules = [
  {
    title: 'Cotizaciones',
    permission: 'QUOTE_MANAGE',
    href: '/panel/cotizaciones',
    group: 'Operación'
  },
  { title: 'Ventas', permission: 'SALE_MANAGE', href: '/panel/ventas', group: 'Operación' },
  { title: 'Pedidos', permission: 'ORDER_MANAGE', href: '/panel/pedidos', group: 'Operación' },
  { title: 'Entregas', permission: 'ORDER_MANAGE', href: '/panel/entregas', group: 'Producción' },
  {
    title: 'Talleres',
    permission: 'WORKSHOP_MANAGE',
    href: '/panel/talleres',
    group: 'Producción'
  },
  {
    title: 'Revisión de avances',
    permission: 'PROGRESS_REVIEW',
    href: '/panel/talleres/avances',
    group: 'Producción'
  },
  { title: 'Productos', permission: 'CATALOG_MANAGE', href: '/panel/catalogo', group: 'Catálogo' },
  {
    title: 'Inventario',
    permission: 'CATALOG_MANAGE',
    href: '/panel/inventario',
    group: 'Catálogo'
  },
  {
    title: 'Usuarios',
    permission: 'USER_MANAGE',
    href: '/panel/usuarios',
    group: 'Administración'
  },
  { title: 'Clientes', permission: 'CUSTOMER_MANAGE', href: '/panel/clientes', group: 'Clientes' }
];
export function PanelShell({ user, children }: { user: MeResponse; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const visibleModules = modules.filter((module) =>
    module.permission === 'USER_MANAGE'
      ? user.role === 'ADMIN' && user.permissions.includes(module.permission)
      : user.role === 'ADMIN' || user.permissions.includes(module.permission)
  );
  async function logout() {
    setLoggingOut(true);
    setLogoutError('');
    try {
      const response = await clientFetch('/api/session/logout', {
        method: 'POST',
        signal: AbortSignal.timeout(20000)
      });
      if (!response.ok) throw new Error('Logout failed');
      router.replace('/iniciar-sesion');
      router.refresh();
    } catch {
      setLogoutError('No pudimos cerrar la sesión. Revisa tu conexión y vuelve a intentarlo.');
      setLoggingOut(false);
    }
  }
  const navigation = (
    <>
      <Link href="/panel" aria-current={pathname === '/panel' ? 'page' : undefined}>
        Inicio del panel
      </Link>
      {visibleModules.map((module, index) => (
        <div className="panel-nav-item" key={module.title}>
          {(index === 0 || visibleModules[index - 1].group !== module.group) && (
            <span className="panel-nav-group">{module.group}</span>
          )}
          {module.href ? (
            <Link
              href={module.href}
              onClick={() => setMenuOpen(false)}
              aria-current={
                (pathname === module.href || pathname.startsWith(`${module.href}/`)) &&
                !visibleModules.some(
                  (other) =>
                    other.href !== module.href &&
                    other.href.startsWith(`${module.href}/`) &&
                    (pathname === other.href || pathname.startsWith(`${other.href}/`))
                )
                  ? 'page'
                  : undefined
              }
            >
              {module.title}
            </Link>
          ) : (
            <span>{module.title}</span>
          )}
        </div>
      ))}
    </>
  );
  return (
    <div className="panel-shell">
      <a className="skip-link" href="#panel-main">
        Saltar al contenido
      </a>
      <aside className="panel-sidebar">
        <Link className="panel-brand" href="/panel">
          <BrandMark className="brand-mark panel-brand-mark" />
          Home Fashion
        </Link>
        <p className="panel-nav-title">Panel interno</p>
        <nav aria-label="Módulos del panel" className="panel-nav">
          {navigation}
        </nav>
      </aside>
      <div className="panel-content">
        <header className="panel-header">
          <div>
            <Link className="panel-header-brand" href="/panel" aria-hidden="true" tabIndex={-1}>
              <BrandMark />
              Home Fashion
            </Link>
            <p className="text-sm text-[var(--color-text-muted)]">{user.fullName}</p>
            <span className="role-tag">
              {user.role === 'ADMIN' ? 'Administración' : 'Equipo interno'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              className="text-sm font-semibold text-[var(--color-primary-text)] underline underline-offset-4"
              href="/catalogo"
            >
              Ver catálogo
            </Link>
            <button
              className="button-link button-link-secondary"
              disabled={loggingOut}
              onClick={logout}
              type="button"
            >
              {loggingOut ? 'Cerrando…' : 'Cerrar sesión'}
            </button>
          </div>
        </header>
        <button
          aria-controls="panel-mobile-menu"
          aria-expanded={menuOpen}
          className="panel-menu-toggle button-link button-link-secondary"
          onClick={() => setMenuOpen(!menuOpen)}
          type="button"
        >
          {menuOpen ? 'Cerrar menú ×' : 'Menú de módulos ☰'}
        </button>
        {menuOpen && (
          <nav aria-label="Módulos del panel" className="panel-mobile-nav" id="panel-mobile-menu">
            {navigation}
          </nav>
        )}
        <main className="panel-main" id="panel-main" tabIndex={-1}>
          {logoutError && (
            <p role="alert" className="form-error mb-6">
              {logoutError}
            </p>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
