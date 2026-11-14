'use client';
import { LoadingState as AdminSkeleton } from './ui/loading-state';
import { formatDateTime } from '@/lib/formatters';

import { money } from '@/lib/sales';
import { useOperationData } from '@/lib/use-operation-data';
import type { Overview } from '@/lib/operations';
import { ListError } from './page-state';
import { DashboardMetricCard } from './dashboard-metric-card';
import { DashboardAttentionCard } from './dashboard-attention-card';
import { DashboardActivity } from './dashboard-activity';

const sections = [
  {
    key: 'requestedQuotes',
    tone: 'primary',
    label: 'Solicitudes',
    title: 'Cotizaciones sin atender',
    href: '/panel/cotizaciones?status=REQUESTED',
    base: '/panel/cotizaciones'
  },
  {
    key: 'openOrders',
    tone: 'accent',
    label: 'Pedidos abiertos',
    title: 'Pedidos por iniciar',
    href: '/panel/pedidos?status=OPEN',
    base: '/panel/pedidos'
  },
  {
    key: 'readyForReview',
    tone: 'highlight',
    label: 'Revisión',
    title: 'Trabajos listos para revisión',
    href: '/panel/talleres/avances',
    base: '/panel/talleres/trabajos'
  },
  {
    key: 'scheduledDeliveries',
    tone: 'success',
    label: 'Entregas',
    title: 'Entregas programadas',
    href: '/panel/entregas?status=SCHEDULED',
    base: '/panel/entregas'
  }
] as const;
export function OperationalSummary() {
  const { data, error, retry } = useOperationData<Overview>('/api/admin/operations/overview');
  if (error) return <ListError message={error} retry={retry} />;
  if (!data) return <AdminSkeleton label="Cargando operación del negocio" />;
  const visible = sections.filter((section) => data.attention[section.key]);
  return (
    <div className="admin-stack mt-8">
      <section aria-label="Resumen">
        <p className="eyebrow">Resumen de hoy</p>
        <div className="dashboard-metrics">
          {visible.map((section) => (
            <DashboardMetricCard
              key={section.key}
              label={section.label}
              tone={section.tone}
              value={data.attention[section.key]!.count}
              href={section.href}
            />
          ))}
        </div>
      </section>
      {!!visible.length && (
        <section>
          <h2 className="font-serif text-2xl">Requiere atención</h2>
          <div className="dashboard-attention">
            {visible.map((section) => (
              <DashboardAttentionCard
                key={section.key}
                title={section.title}
                {...data.attention[section.key]!}
                href={section.href}
                itemHref={(id) =>
                  section.key === 'readyForReview'
                    ? data.capabilities.progressReview
                      ? '/panel/talleres/avances'
                      : `${section.base}/${id}`
                    : `${section.base}/${id}`
                }
              />
            ))}
          </div>
        </section>
      )}
      <div className="dashboard-attention">
        {data.financial && (
          <section className="admin-section">
            <h2 className="font-serif text-2xl">Finanzas</h2>
            <div className="dashboard-metrics">
              <DashboardMetricCard
                label="Saldo pendiente"
                tone="highlight"
                value={money(data.financial.outstandingBalance)}
                href="/panel/ventas"
              />
              <DashboardMetricCard
                label="Ventas parciales"
                tone="primary"
                value={data.financial.partiallyPaidSales}
                href="/panel/ventas"
              />
              <DashboardMetricCard
                label="Ventas pagadas"
                tone="success"
                value={data.financial.paidSales}
                href="/panel/ventas"
              />
            </div>
            <p>
              {data.financial.confirmedSales} ventas confirmadas ·{' '}
              {data.financial.pendingPaymentSales} pendientes de pago
            </p>
          </section>
        )}
        {data.inventory && (
          <section className="admin-section">
            <h2 className="font-serif text-2xl">Inventario</h2>
            <div className="dashboard-metrics">
              <DashboardMetricCard
                label="Sin stock"
                tone="accent"
                value={data.inventory.outOfStockVariants}
                href="/panel/inventario?alert=OUT_OF_STOCK"
              />
              <DashboardMetricCard
                label="Stock bajo"
                tone="highlight"
                value={data.inventory.lowStockVariants}
                href="/panel/inventario?alert=LOW_STOCK"
              />
              <DashboardMetricCard
                label="Unidades reservadas"
                tone="primary"
                value={data.inventory.reservedUnits}
                href="/panel/inventario?alert=RESERVED"
              />
            </div>
            <p>
              {data.inventory.availableUnits} disponibles · {data.inventory.totalActiveVariants}{' '}
              variantes activas
            </p>
          </section>
        )}
        {data.production && (
          <section className="admin-section">
            <h2 className="font-serif text-2xl">Producción</h2>
            <div className="dashboard-metrics">
              <DashboardMetricCard
                label="Asignados"
                tone="primary"
                value={data.production.assigned}
                href="/panel/talleres/trabajos?status=ASSIGNED"
              />
              <DashboardMetricCard
                label="En fabricación"
                tone="accent"
                value={data.production.inProgress}
                href="/panel/talleres/trabajos?status=IN_PROGRESS"
              />
              <DashboardMetricCard
                label="Completados"
                tone="success"
                value={data.production.completed}
                href="/panel/talleres/trabajos?status=COMPLETED"
              />
            </div>
          </section>
        )}
        {data.orders && (
          <section className="admin-section">
            <h2 className="font-serif text-2xl">Pedidos y entregas</h2>
            <div className="dashboard-metrics">
              <DashboardMetricCard
                label="En curso"
                tone="accent"
                value={data.orders.inProgress}
                href="/panel/pedidos?status=IN_PROGRESS"
              />
              <DashboardMetricCard
                label="Listos"
                tone="success"
                value={data.orders.ready}
                href="/panel/pedidos?status=READY"
              />
              {data.deliveries && (
                <DashboardMetricCard
                  label="En camino"
                  tone="primary"
                  value={data.deliveries.outForDelivery}
                  href="/panel/entregas?status=OUT_FOR_DELIVERY"
                />
              )}
            </div>
          </section>
        )}
      </div>
      <DashboardActivity items={data.recentActivity} />
      <p className="text-sm">
        Actualizado: {formatDateTime(data.generatedAt)} ·{' '}
        <button className="text-link" onClick={retry}>
          Actualizar
        </button>
      </p>
    </div>
  );
}
