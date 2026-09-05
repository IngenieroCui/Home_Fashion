'use client';

import { clientFetch } from '@/lib/client-fetch';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  deliveryAssigneeName,
  deliveryStatusLabel,
  formatDeliveryDate,
  type DeliveryDetail,
  type DeliveryPage,
  type DeliverySummary
} from '@/lib/deliveries';
import type { Order } from '@/lib/orders';
import { DeliveryScheduleForm } from './delivery-schedule-form';
import { DeliveryStatusBadge } from './delivery-status-badge';

async function loadOrderDelivery(orderId: string) {
  const params = new URLSearchParams({ orderId, page: '1', limit: '1' });
  const response = await clientFetch(`/api/admin/deliveries?${params}`);
  const body = (await response.json().catch(() => null)) as
    (DeliveryPage & { message?: string }) | null;
  if (!response.ok)
    throw new Error(body?.message ?? 'No fue posible consultar la entrega del pedido.');
  return body?.data[0] ?? null;
}

export function OrderDeliveryPanel({ order }: { order: Order }) {
  const [delivery, setDelivery] = useState<DeliverySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDelivery(await loadOrderDelivery(order.id));
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'No fue posible consultar la entrega del pedido.'
      );
    } finally {
      setLoading(false);
    }
  }, [order.id]);
  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <p className="notice">Consultando entrega del pedido…</p>;
  if (error)
    return (
      <section className="admin-section">
        <h2 className="font-serif text-2xl">Entrega</h2>
        <p className="form-error" role="alert">
          {error}
        </p>
        <button
          className="button-link button-link-secondary"
          onClick={() => void load()}
          type="button"
        >
          Reintentar
        </button>
      </section>
    );
  const terminalOrder = order.status === 'CANCELLED' || order.status === 'COMPLETED';
  if (delivery) {
    const canReschedule = delivery.status === 'CANCELLED' && !terminalOrder;
    return (
      <div className="admin-stack">
        <section className="admin-section">
          <div className="admin-section-title">
            <div>
              <h2 className="font-serif text-2xl">Entrega {delivery.code}</h2>
              <p>
                {formatDeliveryDate(delivery.scheduledDate)}
                {delivery.timeWindow ? ` · ${delivery.timeWindow}` : ''} ·{' '}
                {deliveryAssigneeName(delivery)}
              </p>
            </div>
            <DeliveryStatusBadge status={delivery.status} />
          </div>
          <p className="delivery-help">
            Estado: {deliveryStatusLabel[delivery.status]}
            {delivery.status === 'CANCELLED'
              ? '. Esta programación se conserva como antecedente del pedido.'
              : ''}
          </p>
          <Link className="text-link" href={`/panel/entregas/${delivery.id}`}>
            Ver y gestionar entrega
          </Link>
        </section>
        {canReschedule && (
          <DeliveryScheduleForm
            mode="reschedule"
            onCreated={(created: DeliveryDetail) => setDelivery(created)}
            order={order}
          />
        )}
      </div>
    );
  }
  if (terminalOrder)
    return (
      <section className="admin-section">
        <h2 className="font-serif text-2xl">Entrega</h2>
        <p className="notice">
          El estado actual del pedido no permite programar una entrega nueva.
        </p>
      </section>
    );
  return (
    <DeliveryScheduleForm
      onCreated={(created: DeliveryDetail) => setDelivery(created)}
      order={order}
    />
  );
}
