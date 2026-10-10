'use client';

import { clientFetch } from '@/lib/client-fetch';
import { confirmAction } from '@/lib/confirm-action';
import Link from 'next/link';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { CommerceItemVisual } from './commerce-item-visual';
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

function FilePreview({ file, remove, disabled }: { file: File; remove: () => void; disabled: boolean }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => { const objectUrl = URL.createObjectURL(file); setUrl(objectUrl); return () => URL.revokeObjectURL(objectUrl); }, [file]);
  return <div style={{ width: 120 }}>{url && (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={file.name} src={url} style={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 9 }} />
  )}<button className="text-link" disabled={disabled} onClick={remove} type="button">Quitar</button></div>;
}

export function DeliveryDetail({ id }: { id: string }) {
  const [delivery, setDelivery] = useState<DeliveryDetailType | null>(null);
  const [receiverName, setReceiverName] = useState('');
  const [files, setFiles] = useState<File[]>([]);
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

  async function mutate(action: 'start' | 'cancel' | 'complete-media', payload?: FormData) {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const response = await clientFetch(
        `/api/admin/deliveries/${encodeURIComponent(id)}/${action}`,
        {
          method: 'POST',
          ...(payload ? { body: payload } : {})
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
          : action === 'complete-media'
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
    if (saving) return;
    if (!receiverName.trim()) { setError('Escribe el nombre de quien recibió el pedido.'); return; }
    if (files.length < 1 || files.length > 5) { setError('Selecciona entre una y cinco fotografías.'); return; }
    const form = new FormData();
    form.set('receiverName', receiverName.trim());
    files.forEach((file) => form.append('files', file));
    void mutate('complete-media', form);
  }

  function addFiles(selected: FileList | null) {
    if (!selected) return;
    const next = [...files, ...Array.from(selected)];
    if (next.length > 5 || next.some((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024)) {
      setError('Selecciona hasta cinco imágenes JPG, PNG o WebP de máximo 10 MB cada una.');
      return;
    }
    setError(null);
    setFiles(next);
  }

  async function cancel() {
    if (!(await confirmAction('¿Confirmas que deseas cancelar esta entrega? El pedido no se cancelará.', 'Cancelar entrega')))
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
          <label>
            Nombre de quien recibe
            <input
              maxLength={160}
              onChange={(event) => setReceiverName(event.target.value)}
              required
              value={receiverName}
            />
          </label>
          <fieldset className="delivery-evidence-fieldset" disabled={saving}>
            <legend className="font-semibold">Evidencias (1 a 5 fotografías)</legend>
            <label>Seleccionar fotografías
              <input accept="image/jpeg,image/png,image/webp" disabled={saving || files.length >= 5} multiple onChange={(event) => { addFiles(event.target.files); event.target.value = ''; }} type="file" />
            </label>
            <p>{files.length} / 5 fotografías</p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {files.map((file, index) => <FilePreview disabled={saving} file={file} key={`${file.name}-${index}`} remove={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} />)}
            </div>
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
              <CommerceItemVisual imageUrl={item.imageUrlSnapshot} name={item.productNameSnapshot} variant={item.variantNameSnapshot} quantity={item.quantity} />
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
