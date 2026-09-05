'use client';

import { clientFetch } from '@/lib/client-fetch';
import Link from 'next/link';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  deliveryAssigneeName,
  deliveryStatusLabel,
  deliveryTypeLabel,
  formatDeliveryDate,
  formatDeliveryDateTime,
  formatDeliveryFee,
  type DeliveryDetail as DeliveryDetailType
} from '@/lib/deliveries';
import { orderItemStatusLabel, orderStatusLabel, supplyTypeLabel } from '@/lib/orders';
import { DeliveryStatusBadge } from './delivery-status-badge';
import { EvidenceLinks } from './evidence-links';

async function loadDelivery(id: string) {
  const response = await clientFetch(`/api/admin/deliveries/${encodeURIComponent(id)}`);
  const body = (await response.json().catch(() => null)) as
    (DeliveryDetailType & { message?: string }) | null;
  if (!response.ok) throw new Error(body?.message ?? 'No fue posible cargar la entrega.');
  return body as DeliveryDetailType;
}

function validEvidenceUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export function DeliveryDetail({ id }: { id: string }) {
  const [delivery, setDelivery] = useState<DeliveryDetailType | null>(null);
  const [receiverName, setReceiverName] = useState('');
  const [evidenceUrls, setEvidenceUrls] = useState(['']);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      setDelivery(await loadDelivery(id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No fue posible cargar la entrega.');
    }
  }, [id]);
  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function mutate(action: 'start' | 'cancel' | 'complete', payload?: unknown) {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const response = await clientFetch(
        `/api/admin/deliveries/${encodeURIComponent(id)}/${action}`,
        {
          method: 'POST',
          ...(payload
            ? { headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }
            : {})
        }
      );
      const body = (await response.json().catch(() => null)) as
        (DeliveryDetailType & { message?: string }) | null;
      if (!response.ok) throw new Error(body?.message ?? 'No fue posible actualizar la entrega.');
      if (!body?.id) throw new Error('La respuesta de la entrega fue inesperada.');
      setDelivery(body);
      setNotice(
        action === 'start'
          ? 'La entrega quedó en camino.'
          : action === 'complete'
            ? 'La entrega se completó y quedó registrada con sus evidencias.'
            : 'La entrega fue cancelada.'
      );
    } catch (reason) {
      const message =
        reason instanceof Error ? reason.message : 'No fue posible actualizar la entrega.';
      await refresh();
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  function complete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const urls = evidenceUrls.map((url) => url.trim()).filter(Boolean);
    if (!receiverName.trim()) {
      setError('Escribe el nombre de quien recibió el pedido.');
      return;
    }
    if (!urls.length || urls.length > 5 || urls.some((url) => !validEvidenceUrl(url))) {
      setError('Agrega entre una y cinco URLs válidas de evidencia (http o https).');
      return;
    }
    void mutate('complete', { receiverName: receiverName.trim(), evidenceUrls: urls });
  }

  function cancel() {
    if (!window.confirm('¿Confirmas que deseas cancelar esta entrega? El pedido no se cancelará.'))
      return;
    void mutate('cancel');
  }

  if (!delivery && error)
    return (
      <div className="admin-stack">
        <p className="form-error" role="alert">
          {error}
        </p>
        <button
          className="button-link button-link-secondary"
          onClick={() => void refresh()}
          type="button"
        >
          Reintentar
        </button>
      </div>
    );
  if (!delivery) return <p className="notice">Cargando entrega…</p>;

  return (
    <div className="admin-stack">
      <section className="admin-heading">
        <div>
          <Link className="text-link" href="/panel/entregas">
            ← Entregas
          </Link>
          <p className="eyebrow">{delivery.code}</p>
          <h1 className="font-serif text-4xl">Detalle de la entrega</h1>
        </div>
        <DeliveryStatusBadge status={delivery.status} />
      </section>
      {notice && (
        <p className="admin-success" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {(delivery.status === 'SCHEDULED' || delivery.status === 'OUT_FOR_DELIVERY') && (
        <section className="admin-section">
          <h2 className="font-serif text-2xl">Acciones</h2>
          <p className="delivery-help">
            {delivery.status === 'SCHEDULED'
              ? 'Inicia la entrega solo cuando todos los elementos vigentes estén reservados o listos.'
              : 'Registra la recepción y las evidencias al finalizar el recorrido.'}
          </p>
          <div className="admin-actions">
            {delivery.status === 'SCHEDULED' && (
              <button
                className="button-link"
                disabled={saving}
                onClick={() => void mutate('start')}
                type="button"
              >
                {saving ? 'Actualizando…' : 'Iniciar entrega'}
              </button>
            )}
            <button
              className="button-link button-link-secondary"
              disabled={saving}
              onClick={cancel}
              type="button"
            >
              Cancelar entrega
            </button>
          </div>
        </section>
      )}
      {delivery.status === 'OUT_FOR_DELIVERY' && (
        <form className="admin-form admin-form-wide" onSubmit={complete}>
          <h2 className="font-serif text-2xl">Completar entrega</h2>
          <p className="notice">
            Ingresa URLs de evidencias que ya estén alojadas. Esta pantalla no carga archivos.
          </p>
          <label>
            Nombre de quien recibe
            <input
              maxLength={160}
              onChange={(event) => setReceiverName(event.target.value)}
              required
              value={receiverName}
            />
          </label>
          <fieldset className="delivery-evidence-fieldset">
            <legend className="font-semibold">Evidencias (1 a 5 URLs)</legend>
            {evidenceUrls.map((url, index) => (
              <div className="delivery-evidence-row" key={index}>
                <label>
                  Evidencia {index + 1}
                  <input
                    onChange={(event) =>
                      setEvidenceUrls((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? event.target.value : item
                        )
                      )
                    }
                    placeholder="https://…"
                    required
                    type="url"
                    value={url}
                  />
                </label>
                {evidenceUrls.length > 1 && (
                  <button
                    className="button-link button-link-secondary"
                    onClick={() =>
                      setEvidenceUrls((current) =>
                        current.filter((_, itemIndex) => itemIndex !== index)
                      )
                    }
                    type="button"
                  >
                    Quitar
                  </button>
                )}
              </div>
            ))}
            {evidenceUrls.length < 5 && (
              <button
                className="button-link button-link-secondary"
                onClick={() => setEvidenceUrls((current) => [...current, ''])}
                type="button"
              >
                Agregar otra evidencia
              </button>
            )}
          </fieldset>
          <div className="admin-actions">
            <button className="button-link" disabled={saving} type="submit">
              {saving ? 'Completando…' : 'Confirmar entrega recibida'}
            </button>
          </div>
        </form>
      )}
      <section className="admin-section">
        <h2 className="font-serif text-2xl">Programación</h2>
        <div className="delivery-detail-grid">
          <p>
            <strong>Estado</strong>
            <span>{deliveryStatusLabel[delivery.status]}</span>
          </p>
          <p>
            <strong>Fecha</strong>
            <span>{formatDeliveryDate(delivery.scheduledDate)}</span>
          </p>
          <p>
            <strong>Franja</strong>
            <span>{delivery.timeWindow ?? '—'}</span>
          </p>
          <p>
            <strong>Tipo</strong>
            <span>{deliveryTypeLabel[delivery.deliveryType]}</span>
          </p>
          <p>
            <strong>Responsable</strong>
            <span>{deliveryAssigneeName(delivery)}</span>
          </p>
          <p>
            <strong>Tarifa acordada</strong>
            <span>{formatDeliveryFee(delivery.fee)}</span>
          </p>
          <p>
            <strong>Contacto</strong>
            <span>{delivery.contactName}</span>
          </p>
          <p>
            <strong>Teléfono</strong>
            <span>{delivery.contactPhone}</span>
          </p>
          <p className="delivery-detail-wide">
            <strong>Dirección</strong>
            <span>{delivery.address}</span>
          </p>
          <p className="delivery-detail-wide">
            <strong>Referencia</strong>
            <span>{delivery.addressReference ?? '—'}</span>
          </p>
          <p className="delivery-detail-wide">
            <strong>Notas internas</strong>
            <span>{delivery.notes ?? '—'}</span>
          </p>
        </div>
      </section>
      <section className="admin-section">
        <h2 className="font-serif text-2xl">Pedido</h2>
        <p>
          <Link className="text-link" href={`/panel/pedidos/${delivery.order.id}`}>
            {delivery.order.code}
          </Link>{' '}
          · {orderStatusLabel[delivery.order.status]}
        </p>
        <p>
          Cliente: {delivery.customer.fullName}
          {delivery.customer.phone ? ` · ${delivery.customer.phone}` : ''}
        </p>
        <p>Fecha prometida: {formatDeliveryDate(delivery.order.promisedDate)}</p>
        <div className="payment-history">
          {delivery.items.map((item) => (
            <article className="payment-entry" key={item.id}>
              <strong>
                {item.productNameSnapshot}
                {item.variantNameSnapshot ? ` · ${item.variantNameSnapshot}` : ''}
              </strong>
              <p>
                SKU: {item.skuSnapshot ?? '—'} · Cantidad: {item.quantity}
              </p>
              <p>Suministro: {supplyTypeLabel[item.supplyType]}</p>
              <p>Estado: {orderItemStatusLabel[item.status]}</p>
            </article>
          ))}
        </div>
      </section>
      {delivery.status === 'DELIVERED' && (
        <section className="admin-section">
          <h2 className="font-serif text-2xl">Recepción</h2>
          <p>Recibió: {delivery.receiverName}</p>
          <p>Entregada: {formatDeliveryDateTime(delivery.deliveredAt)}</p>
        </section>
      )}
      <EvidenceLinks urls={delivery.evidenceUrls} />
      <section className="admin-section delivery-audit">
        <p>
          Programó: {delivery.createdByUser.fullName ?? delivery.createdByUser.name ?? '—'} ·{' '}
          {formatDeliveryDateTime(delivery.createdAt)}
        </p>
        <p>Última actualización: {formatDeliveryDateTime(delivery.updatedAt)}</p>
      </section>
    </div>
  );
}
