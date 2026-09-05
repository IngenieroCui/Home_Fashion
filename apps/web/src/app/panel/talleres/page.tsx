import Link from 'next/link';
import { requireWorkshopAccess } from '@/lib/auth/customer-quote-access';

export const dynamic = 'force-dynamic';

export default async function WorkshopsPage() {
  const user = await requireWorkshopAccess();
  return (
    <div className="admin-stack">
      <section className="admin-heading">
        <div>
          <p className="eyebrow">Talleres</p>
          <h1 className="font-serif text-4xl">Asignaciones a talleres</h1>
          <p>
            Asigna elementos pendientes de fabricación desde el detalle de cada pedido y consulta
            sus trabajos.
          </p>
        </div>
      </section>
      <section className="admin-section">
        <h2 className="font-serif text-2xl">Operación</h2>
        <div className="admin-actions">
          {(user.role === 'ADMIN' || user.permissions.includes('WORKSHOP_MANAGE')) && (
            <Link className="button-link" href="/panel/talleres/trabajos">
              Trabajos asignados
            </Link>
          )}
          {(user.role === 'ADMIN' || user.permissions.includes('PROGRESS_REVIEW')) && (
            <Link className="button-link" href="/panel/talleres/avances">
              Revisión de avances
            </Link>
          )}
          {(user.role === 'ADMIN' || user.permissions.includes('ORDER_MANAGE')) && (
            <Link className="button-link button-link-secondary" href="/panel/pedidos">
              Pedidos por asignar
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
