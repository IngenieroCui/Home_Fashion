import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAuthenticatedUser, sessionTokens } from '@/lib/auth/server';
import { OperationalSummary } from '@/components/operational-summary';

const modules = [
  {
    title: 'Inventario',
    description: 'Existencias, reservas y disponibilidad real.',
    href: '/panel/inventario',
    permission: 'CATALOG_MANAGE'
  },
  {
    title: 'Productos',
    description: 'Productos, variantes e inventario terminado.',
    href: '/panel/catalogo',
    permission: 'CATALOG_MANAGE'
  },
  {
    title: 'Clientes',
    description: 'Datos de contacto y atención cercana.',
    href: '/panel/clientes',
    permission: 'CUSTOMER_MANAGE'
  },
  {
    title: 'Cotizaciones',
    description: 'Solicitudes, propuestas y precios acordados.',
    href: '/panel/cotizaciones',
    permission: 'QUOTE_MANAGE'
  },
  {
    title: 'Ventas',
    description: 'Ventas confirmadas, abonos y saldos.',
    href: '/panel/ventas',
    permission: 'SALE_MANAGE'
  },
  {
    title: 'Pedidos',
    description: 'Del inventario o el taller hasta el cliente.',
    href: '/panel/pedidos',
    permission: 'ORDER_MANAGE'
  },
  {
    title: 'Entregas',
    description: 'Programación, responsables y recepción.',
    href: '/panel/entregas',
    permission: 'ORDER_MANAGE'
  },
  {
    title: 'Talleres',
    description: 'Asigna trabajos y consulta su fabricación.',
    href: '/panel/talleres',
    permission: 'WORKSHOP_MANAGE'
  },
  {
    title: 'Revisión de avances',
    description: 'Revisa reportes antes de compartirlos con el cliente.',
    href: '/panel/talleres/avances',
    permission: 'PROGRESS_REVIEW'
  }
];

export default async function PanelPage() {
  const { accessToken, refreshToken } = await sessionTokens();
  const user = await getAuthenticatedUser(accessToken);
  if (!user && refreshToken) redirect('/api/session/refresh?next=/panel');
  if (!user || user.role === 'WORKSHOP') redirect('/iniciar-sesion');
  const visibleModules = modules.filter(
    (module) => user.role === 'ADMIN' || user.permissions.includes(module.permission)
  );
  return (
    <>
      <section className="panel-welcome">
        <p className="eyebrow">Panel interno</p>
        <h1 className="font-serif text-4xl text-[var(--color-text)]">
          Buenos días, {user.fullName.split(' ')[0]}
        </h1>
        <p>
          Esto es lo que necesita atención en Home Fashion. Consulta la operación y continúa donde
          hace falta.
        </p>
      </section>
      <OperationalSummary />
      <section className="panel-quick-actions" aria-label="Acciones rápidas">
        <h2 className="font-serif text-2xl">Empieza por aquí</h2>
        <div className="panel-quick-grid">
          {(user.role === 'ADMIN' || user.permissions.includes('CUSTOMER_MANAGE')) && (
            <Link href="/panel/clientes/nuevo">+ Nuevo cliente</Link>
          )}
          {(user.role === 'ADMIN' || user.permissions.includes('QUOTE_MANAGE')) && (
            <Link href="/panel/cotizaciones/nueva">+ Nueva cotización</Link>
          )}
          {(user.role === 'ADMIN' || user.permissions.includes('SALE_MANAGE')) && (
            <Link href="/panel/ventas/nueva">+ Nueva venta</Link>
          )}
          {(user.role === 'ADMIN' || user.permissions.includes('CATALOG_MANAGE')) && (
            <Link href="/panel/catalogo/nuevo">+ Nuevo producto</Link>
          )}
        </div>
      </section>
      <section className="mt-8">
        <h2 className="font-serif text-2xl text-[var(--color-text)]">Módulos operativos</h2>
        {!visibleModules.length && (
          <p className="notice mt-4">
            Tu cuenta aún no tiene módulos habilitados. Solicita al administrador los permisos
            necesarios para tu trabajo.
          </p>
        )}
        <div className="panel-module-grid">
          {visibleModules.map((module) => (
            <Link className="panel-module" href={module.href} key={module.title}>
              <h3>{module.title}</h3>
              <p>{module.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
