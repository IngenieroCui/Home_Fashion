import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAuthenticatedUser, sessionTokens } from '@/lib/auth/server';

const modules = [
  {
    title: 'Catálogo',
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
        <h1 className="font-serif text-4xl text-[#3d291e]">Tu negocio, en un solo lugar</h1>
        <p>
          Organiza la atención al cliente y acompaña cada pedido, desde la primera cotización hasta
          la entrega.
        </p>
        <Link className="button-link mt-6" href="/catalogo">
          Ir al catálogo público
        </Link>
      </section>
      <section className="mt-8">
        <h2 className="font-serif text-2xl text-[#3d291e]">Módulos operativos</h2>
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
