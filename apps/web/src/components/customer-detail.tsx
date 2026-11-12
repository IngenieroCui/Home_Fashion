'use client';
import { LoadingState as AdminSkeleton } from './ui/loading-state';
import { formatDateTime, formatDate } from '@/lib/formatters';

import Link from 'next/link';
import { useState } from 'react';
import type { Customer360 } from '@/lib/operations';
import { useOperationData } from '@/lib/use-operation-data';
import { money, paymentStatusLabel } from '@/lib/sales';
import { quoteStatusLabel } from '@/lib/customer-quote-utils';
import { orderStatusLabel } from '@/lib/orders';
import { deliveryStatusLabel } from '@/lib/deliveries';
import { CustomerForm } from './customer-form';
import { DashboardMetricCard } from './dashboard-metric-card';
import { AdminRecordCard } from './admin-record-card';
import { CommerceItemVisual } from './commerce-item-visual';
import { ListError } from './page-state';
type Tab = 'summary' | 'quotes' | 'sales' | 'orders' | 'deliveries';
export function CustomerDetail({ id, created }: { id: string; created: boolean }) {
  const { data, error, retry } = useOperationData<Customer360>(
    `/api/admin/operations/customers/${encodeURIComponent(id)}`
  );
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<Tab>('summary');
  if (error) return <ListError message={error} retry={retry} />;
  if (!data) return <AdminSkeleton label="Cargando ficha del cliente" />;
  const { customer, capabilities: can, summary } = data;
  const tabs: { key: Tab; label: string }[] = [
    { key: 'summary', label: 'Resumen' },
    ...(can.quotes ? [{ key: 'quotes' as const, label: 'Cotizaciones' }] : []),
    ...(can.sales ? [{ key: 'sales' as const, label: 'Ventas' }] : []),
    ...(can.orders ? [{ key: 'orders' as const, label: 'Pedidos' }] : []),
    ...(can.deliveries ? [{ key: 'deliveries' as const, label: 'Entregas' }] : [])
  ];
  const current = tabs.some((item) => item.key === tab) ? tab : 'summary';
  return (
    <div className="admin-stack">
      <section className="admin-heading">
        <div>
          <Link className="text-link" href="/panel/clientes">
            ← Clientes
          </Link>
          <p className="eyebrow">Cliente 360</p>
          <h1 className="font-serif text-4xl">{customer.fullName}</h1>
          <p>
            {customer.documentType} {customer.documentNumber || 'Sin documento'} · {customer.phone}
          </p>
          <p>
            {customer.email || 'Sin correo'} · {customer.city || 'Sin ciudad'}
          </p>
          <span
            className={`admin-status ${customer.isActive ? 'admin-status-active' : 'admin-status-inactive'}`}
          >
            {customer.isActive ? 'Activo' : 'Inactivo'}
          </span>
        </div>
        <div className="admin-actions">
          <button
            className="button-link button-link-secondary"
            onClick={() => setEditing(!editing)}
          >
            {editing ? 'Cerrar edición' : 'Editar cliente'}
          </button>
          {can.quotes && (
            <Link
              className="button-link"
              href={`/panel/cotizaciones/nueva?customerId=${encodeURIComponent(id)}`}
            >
              Nueva cotización
            </Link>
          )}
          {can.sales && (
            <Link
              className="button-link"
              href={`/panel/ventas/nueva?customerId=${encodeURIComponent(id)}`}
            >
              Nueva venta
            </Link>
          )}
        </div>
      </section>
      {created && <p className="admin-success">Cliente creado correctamente.</p>}
      {editing && (
        <section className="admin-section">
          <CustomerForm
            customer={customer}
            onSaved={() => {
              setEditing(false);
              retry();
            }}
          />
        </section>
      )}
      <div className="dashboard-metrics">
        {can.quotes && (
          <DashboardMetricCard
            label="Cotizaciones"
            value={summary.quoteCount ?? 0}
            href={`/panel/cotizaciones?customerId=${encodeURIComponent(id)}`}
            detail={`${summary.activeQuoteCount ?? 0} activas`}
          />
        )}{' '}
        {can.sales && (
          <DashboardMetricCard
            label="Ventas"
            value={summary.saleCount ?? 0}
            href={`/panel/ventas?customerId=${encodeURIComponent(id)}`}
          />
        )}{' '}
        {can.orders && (
          <DashboardMetricCard
            label="Pedidos activos"
            value={summary.activeOrderCount ?? 0}
            href={`/panel/pedidos?customerId=${encodeURIComponent(id)}`}
            detail={`${summary.orderCount ?? 0} en total`}
          />
        )}{' '}
        {can.sales && (
          <DashboardMetricCard
            label="Saldo pendiente"
            value={money(summary.outstandingBalance)}
            href={`/panel/ventas?customerId=${encodeURIComponent(id)}`}
          />
        )}
      </div>
      <label className="customer-tab-selector">
        Sección del cliente
        <select value={current} onChange={(event) => setTab(event.target.value as Tab)}>
          {tabs.map((item) => (
            <option key={item.key} value={item.key}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <nav className="customer-tabs" aria-label="Información del cliente">
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            aria-current={current === item.key ? 'page' : undefined}
            onClick={() => setTab(item.key)}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <section
        className="admin-section"
        aria-label={tabs.find((item) => item.key === current)?.label}
      >
        {current === 'summary' && (
          <>
            <h2 className="font-serif text-2xl">Resumen del cliente</h2>
            <dl className="record-values">
              <div>
                <dt>Dirección</dt>
                <dd>{customer.address || 'Sin dirección'}</dd>
              </div>
              <div>
                <dt>Barrio</dt>
                <dd>{customer.neighborhood || 'Sin barrio'}</dd>
              </div>
              <div>
                <dt>Última actividad</dt>
                <dd>
                  {summary.lastActivityAt
                    ? formatDateTime(summary.lastActivityAt)
                    : 'Sin actividad'}
                </dd>
              </div>
            </dl>
            <p className="mt-4">{customer.notes || 'No hay notas adicionales.'}</p>
            <p className="notice mt-4">
              Consulta las secciones para ver los 10 registros más recientes. Los indicadores
              incluyen todo el historial autorizado.
            </p>
          </>
        )}
        {current === 'quotes' && (
          <>
            <h2 className="font-serif text-2xl">Cotizaciones recientes</h2>
            <div className="customer-records">
              {data.quotes?.map((quote) => (
                <AdminRecordCard
                  key={quote.id}
                  title={quote.code}
                  subtitle={formatDate(quote.createdAt)}
                  badge={<span className="admin-status">{quoteStatusLabel[quote.status]}</span>}
                  actions={
                    <Link className="text-link" href={`/panel/cotizaciones/${quote.id}`}>
                      Ver cotización →
                    </Link>
                  }
                >
                  <p>Total: {money(quote.total)}</p>
                  <p>Vigencia: {quote.validUntil ? formatDate(quote.validUntil) : 'Sin definir'}</p>
                </AdminRecordCard>
              ))}
              {!data.quotes?.length && (
                <p className="notice">
                  Este cliente aún no tiene cotizaciones. Puedes crear una desde el encabezado.
                </p>
              )}
            </div>
          </>
        )}
        {current === 'sales' && (
          <>
            <h2 className="font-serif text-2xl">Ventas recientes</h2>
            <div className="customer-records">
              {data.sales?.map((sale) => (
                <AdminRecordCard
                  key={sale.id}
                  title={sale.code}
                  subtitle={`${formatDate(sale.createdAt)} · ${sale.status === 'CONFIRMED' ? 'Confirmada' : 'Cancelada'}`}
                  badge={
                    <span className="admin-status">{paymentStatusLabel[sale.paymentStatus]}</span>
                  }
                  actions={
                    <Link className="text-link" href={`/panel/ventas/${sale.id}`}>
                      Ver venta →
                    </Link>
                  }
                >
                  <dl className="record-values">
                    <div>
                      <dt>Total</dt>
                      <dd>{money(sale.total)}</dd>
                    </div>
                    <div>
                      <dt>Pagado</dt>
                      <dd>{money(sale.amountPaid)}</dd>
                    </div>
                    <div>
                      <dt>Saldo</dt>
                      <dd>{money(sale.balance)}</dd>
                    </div>
                  </dl>
                </AdminRecordCard>
              ))}
              {!data.sales?.length && (
                <p className="notice">
                  Este cliente aún no tiene ventas. Puedes registrar una desde el encabezado.
                </p>
              )}
            </div>
          </>
        )}
        {current === 'orders' && (
          <>
            <h2 className="font-serif text-2xl">Pedidos recientes</h2>
            <div className="customer-records">
              {data.orders?.map((order) => (
                <AdminRecordCard
                  key={order.id}
                  title={order.code}
                  subtitle={`Creado: ${formatDate(order.createdAt)}`}
                  badge={<span className="admin-status">{orderStatusLabel[order.status]}</span>}
                  actions={
                    <Link className="text-link" href={`/panel/pedidos/${order.id}`}>
                      Ver pedido →
                    </Link>
                  }
                >
                  {order.imageUrlSnapshot && (
                    <CommerceItemVisual
                      imageUrl={order.imageUrlSnapshot}
                      name="Primer mueble del pedido"
                    />
                  )}
                  <p>Fecha prometida: {order.promisedDate || 'Sin definir'}</p>
                </AdminRecordCard>
              ))}
              {!data.orders?.length && (
                <p className="notice">
                  No hay pedidos para este cliente. Se preparan desde una venta confirmada.
                </p>
              )}
            </div>
          </>
        )}
        {current === 'deliveries' && (
          <>
            <h2 className="font-serif text-2xl">Entregas recientes</h2>
            <div className="customer-records">
              {data.deliveries?.map((delivery) => (
                <AdminRecordCard
                  key={delivery.id}
                  title={delivery.code}
                  subtitle={delivery.scheduledDate}
                  badge={
                    <span className="admin-status">{deliveryStatusLabel[delivery.status]}</span>
                  }
                  actions={
                    <Link className="text-link" href={`/panel/entregas/${delivery.id}`}>
                      Ver entrega →
                    </Link>
                  }
                >
                  {delivery.deliveredAt && <p>Entregada: {formatDateTime(delivery.deliveredAt)}</p>}
                </AdminRecordCard>
              ))}
              {!data.deliveries?.length && (
                <p className="notice">
                  No hay entregas para este cliente. Se programan cuando el pedido está listo.
                </p>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
