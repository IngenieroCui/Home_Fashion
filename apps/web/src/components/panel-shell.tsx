'use client';
import { clientFetch } from '@/lib/client-fetch';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import type { MeResponse } from '@/lib/auth/types';

const modules = [
  { title: 'Catálogo', permission: 'CATALOG_MANAGE', href: '/panel/catalogo' },
  { title: 'Clientes', permission: 'CUSTOMER_MANAGE', href: '/panel/clientes' },
  { title: 'Cotizaciones', permission: 'QUOTE_MANAGE', href: '/panel/cotizaciones' },
  { title: 'Ventas', permission: 'SALE_MANAGE', href: '/panel/ventas' },
  { title: 'Pedidos', permission: 'ORDER_MANAGE', href: '/panel/pedidos' },
  { title: 'Entregas', permission: 'ORDER_MANAGE', href: '/panel/entregas' },
  { title: 'Talleres', permission: 'WORKSHOP_MANAGE', href: '/panel/talleres' },
  { title: 'Revisión de avances', permission: 'PROGRESS_REVIEW', href: '/panel/talleres/avances' }
];
export function PanelShell({ user, children }: { user: MeResponse; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const visibleModules = modules.filter(
    (module) => user.role === 'ADMIN' || user.permissions.includes(module.permission)
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
      {visibleModules.map((module) =>
        module.href ? (
          <Link
            href={module.href}
            key={module.title}
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
          <span key={module.title}>{module.title}</span>
        )
      )}
    </>
  );
  return (
    <div className="panel-shell">
      <a className="skip-link" href="#panel-main">
        Saltar al contenido
      </a>
      <aside className="panel-sidebar">
        <Link className="font-serif text-2xl font-bold" href="/panel">
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
            <p className="text-sm text-[#67574d]">{user.fullName}</p>
            <span className="role-tag">
              {user.role === 'ADMIN' ? 'Administración' : 'Equipo interno'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              className="text-sm font-semibold text-[#a64b32] underline underline-offset-4"
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
        <nav aria-label="Módulos del panel" className="panel-mobile-nav">
          {navigation}
        </nav>
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
