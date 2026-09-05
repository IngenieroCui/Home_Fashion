'use client';

import { clientFetch } from '@/lib/client-fetch';
import { useState, type FormEvent } from 'react';
import {
  deliveryTypeLabel,
  type DeliveryDetail,
  type DeliveryType,
  type DeliveryUser
} from '@/lib/deliveries';
import type { Order } from '@/lib/orders';
import { DeliveryAssigneeSelect } from './delivery-assignee-select';

export function DeliveryScheduleForm({
  order,
  onCreated,
  mode = 'schedule'
}: {
  order: Order;
  onCreated: (delivery: DeliveryDetail) => void;
  mode?: 'schedule' | 'reschedule';
}) {
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('OWNER');
  const [assignee, setAssignee] = useState<DeliveryUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (deliveryType !== 'EXTERNAL_DRIVER' && !assignee) {
      setError('Selecciona un responsable interno para la entrega.');
      return;
    }
    const data = new FormData(event.currentTarget);
    const text = (name: string) => String(data.get(name) ?? '').trim() || undefined;
    const fee = text('fee');
    if (fee && (!/^\d{1,10}(?:\.\d{1,2})?$/.test(fee) || Number(fee) > 9999999999.99)) {
      setError('La tarifa debe estar entre 0 y 9.999.999.999,99, con máximo dos decimales.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const response = await clientFetch('/api/admin/deliveries', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          address: text('address'),
          addressReference: text('addressReference'),
          contactName: text('contactName'),
          contactPhone: text('contactPhone'),
          scheduledDate: text('scheduledDate'),
          timeWindow: text('timeWindow'),
          deliveryType,
          assignedUserId: deliveryType === 'EXTERNAL_DRIVER' ? undefined : assignee?.id,
          externalDriverName:
            deliveryType === 'EXTERNAL_DRIVER' ? text('externalDriverName') : undefined,
          fee,
          notes: text('notes')
        })
      });
      const body = (await response.json().catch(() => null)) as
        (DeliveryDetail & { message?: string }) | null;
      if (!response.ok)
        throw new Error(
          body?.message ??
            (mode === 'reschedule'
              ? 'No fue posible reprogramar la entrega.'
              : 'No fue posible programar la entrega.')
        );
      if (!body?.id) throw new Error('La respuesta de la entrega fue inesperada.');
      onCreated(body);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : mode === 'reschedule'
            ? 'No fue posible reprogramar la entrega.'
            : 'No fue posible programar la entrega.'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="admin-form admin-form-wide" onSubmit={submit}>
      <h2 className="font-serif text-2xl">
        {mode === 'reschedule' ? 'Reprogramar entrega' : 'Programar entrega'}
      </h2>
      <p className="notice">
        {mode === 'reschedule'
          ? `La entrega cancelada conservará su código y recibirá una nueva programación para ${order.code}.`
          : `La entrega quedará vinculada a ${order.code}.`}{' '}
        Podrás iniciarla cuando todos los elementos vigentes estén reservados o listos.
      </p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <label>
        Dirección de entrega
        <input autoComplete="street-address" maxLength={500} name="address" required />
      </label>
      <label>
        Referencia de la dirección (opcional)
        <input maxLength={255} name="addressReference" placeholder="Casa esquinera, portería…" />
      </label>
      <label>
        Persona de contacto
        <input
          autoComplete="name"
          defaultValue={order.customer?.fullName ?? ''}
          maxLength={160}
          name="contactName"
          required
        />
      </label>
      <label>
        Teléfono de contacto
        <input
          autoComplete="tel"
          defaultValue={order.customer?.phone ?? ''}
          maxLength={40}
          name="contactPhone"
          required
          type="tel"
        />
      </label>
      <label>
        Fecha programada
        <input name="scheduledDate" required type="date" />
      </label>
      <label>
        Franja horaria (opcional)
        <input maxLength={80} name="timeWindow" placeholder="Ej. 2:00 p. m. a 5:00 p. m." />
      </label>
      <label>
        Tipo de responsable
        <select
          onChange={(event) => {
            setDeliveryType(event.target.value as DeliveryType);
            setAssignee(null);
          }}
          value={deliveryType}
        >
          {(Object.keys(deliveryTypeLabel) as DeliveryType[]).map((type) => (
            <option key={type} value={type}>
              {deliveryTypeLabel[type]}
            </option>
          ))}
        </select>
      </label>
      {deliveryType === 'EXTERNAL_DRIVER' ? (
        <label>
          Nombre del conductor externo
          <input maxLength={160} name="externalDriverName" required />
        </label>
      ) : (
        <DeliveryAssigneeSelect
          deliveryType={deliveryType}
          key={deliveryType}
          onChange={setAssignee}
          value={assignee}
        />
      )}
      <label>
        Tarifa acordada (opcional)
        <input
          inputMode="decimal"
          maxLength={13}
          name="fee"
          pattern="\d{1,10}(\.\d{1,2})?"
          title="Máximo 9.999.999.999,99 y hasta dos decimales"
          type="text"
        />
      </label>
      <label>
        Notas internas (opcional)
        <textarea maxLength={4000} name="notes" />
      </label>
      <div className="admin-actions">
        <button className="button-link" disabled={saving} type="submit">
          {saving
            ? mode === 'reschedule'
              ? 'Reprogramando…'
              : 'Programando…'
            : mode === 'reschedule'
              ? 'Confirmar reprogramación'
              : 'Programar entrega'}
        </button>
      </div>
    </form>
  );
}
