'use client';

import { clientFetch } from '@/lib/client-fetch';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { orderItemStatusLabel, orderStatusLabel, supplyTypeLabel, type Order } from '@/lib/orders';
import { formatCustomization } from '@/lib/workshop-jobs';
import { AssignWorkshopJobForm } from './assign-workshop-job-form';
import { OrderDeliveryPanel } from './order-delivery-panel';
import { WorkshopJobSummary } from './workshop-job-summary';
import { OrderTrackingAccessPanel } from './order-tracking-access-panel';

async function loadOrder(id: string) {
  const response = await clientFetch(`/api/admin/orders/${encodeURIComponent(id)}`);
  const body = (await response.json().catch(() => null)) as { message?: string } | null;
  if (!response.ok) throw new Error(body?.message ?? 'No fue posible cargar el pedido.');
  return body as Order;
}

export function OrderDetail({ id, canWorkshopManage }: { id: string; canWorkshopManage: boolean }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [assignmentNotice, setAssignmentNotice] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    setError(null);
    try {
      setOrder(await loadOrder(id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No fue posible cargar el pedido.');
    }
  }, [id]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  if (error)
    return (
      <p className="form-error" role="alert">
        {error}
      </p>
    );
  if (!order) return <p className="notice">Cargando pedido…</p>;
  return (
    <div className="admin-stack">
      <section className="admin-heading">
        <div>
          <Link className="text-link" href="/panel/pedidos">
            ← Pedidos
          </Link>
          <p className="eyebrow">{order.code}</p>
          <h1 className="font-serif text-4xl">Pedido {orderStatusLabel[order.status]}</h1>
        </div>
        <span className="admin-status">{orderStatusLabel[order.status]}</span>
      </section>
      {assignmentNotice && (
        <p className="notice" role="status">
          {assignmentNotice}
        </p>
      )}
      <section className="admin-section">
        <p>Cliente: {order.customer?.fullName ?? '—'}</p>
        <p>Venta: {order.sale?.code ?? order.saleId}</p>
        <p>Creado: {new Date(order.createdAt).toLocaleString('es-CO')}</p>
        <p>Fecha prometida: {order.promisedDate ?? '—'}</p>
        {order.createdByUser && <p>Registró: {order.createdByUser.fullName}</p>}
        <p>Notas: {order.notes ?? '—'}</p>
      </section>
      <section className="admin-section">
        <h2 className="font-serif text-2xl">Elementos</h2>
        <div className="payment-history">
          {order.items?.map((item) => {
            const canAssign =
              canWorkshopManage &&
              item.workshopJob === null &&
              item.supplyType === 'MADE_TO_ORDER' &&
              item.status === 'PENDING_PRODUCTION';
            const customizations = formatCustomization(item.customization);
            return (
              <article className="payment-entry" key={item.id}>
                <strong>
                  {item.productNameSnapshot}
                  {item.variantNameSnapshot ? ` · ${item.variantNameSnapshot}` : ''}
                </strong>
                <p>
                  SKU: {item.skuSnapshot ?? '—'} · Cantidad: {item.quantity}
                </p>
                {customizations.map((entry) => (
                  <p key={entry.label}>
                    Personalización — {entry.label}: {entry.value}
                  </p>
                ))}
                <p>Suministro: {supplyTypeLabel[item.supplyType]}</p>
                <p>Estado: {orderItemStatusLabel[item.status]}</p>
                {item.notes && <p>Notas: {item.notes}</p>}
                {item.workshopJob && <WorkshopJobSummary job={item.workshopJob} />}
                {canAssign && (
                  <AssignWorkshopJobForm
                    item={item}
                    onAssigned={() => void refresh()}
                    onConflict={() => {
                      setAssignmentNotice(
                        'Otro usuario pudo haber asignado el elemento. El pedido se recargó para mostrar la asignación existente.'
                      );
                      void refresh();
                    }}
                  />
                )}
              </article>
            );
          })}
        </div>
      </section>
      <OrderDeliveryPanel order={order} />
      <OrderTrackingAccessPanel orderId={id} />
    </div>
  );
}
