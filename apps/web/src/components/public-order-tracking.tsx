import { CommerceItemVisual } from './commerce-item-visual';
import { EvidenceLinks } from './evidence-links';
import { Fragment } from 'react';
import { formatCustomization } from '@/lib/workshop-jobs';
import {
  formatTrackingDate,
  formatTrackingDateTime,
  publicItemStatusLabel,
  publicOrderStatusLabel,
  publicSupplyTypeLabel,
  publicTimelineTypeLabel,
  type PublicOrderTracking,
  type PublicTrackingItem
} from '@/lib/order-tracking';

function PublicTrackingStatusBadge({ status }: { status: PublicOrderTracking['orderStatus'] }) {
  return <span className="public-status-badge">{publicOrderStatusLabel[status]}</span>;
}

function PublicTrackingTimeline({ item }: { item: PublicTrackingItem }) {
  if (!item.timeline.length)
    return <p className="public-empty">Todavía no hay avances publicados para este producto.</p>;
  return (
    <ol className="public-timeline">
      {item.timeline.map((entry, index) => (
        <li key={`${entry.submittedAt}-${index}`}>
          <div>
            <strong>{publicTimelineTypeLabel[entry.type]}</strong>
            <time>{formatTrackingDateTime(entry.submittedAt)}</time>
          </div>
          <p>{entry.message}</p>
          {entry.progressPercent !== null && (
            <p className="public-timeline-progress">Avance: {entry.progressPercent}%</p>
          )}
          <EvidenceLinks urls={entry.evidenceUrls} title="Fotografías del avance" />
        </li>
      ))}
    </ol>
  );
}

function OrderProgress({ tracking }: { tracking: PublicOrderTracking }) {
  // A global summary of observed public states, without manufacturing dated events.
  const activeItems = tracking.items.filter((item) => item.status !== 'CANCELLED');
  const manufacturing = activeItems.some((item) => item.supplyType === 'MADE_TO_ORDER');
  const stock = activeItems.some((item) => item.supplyType === 'IN_STOCK');
  const preparationLabel = manufacturing
    ? stock
      ? 'Preparación y fabricación'
      : 'Fabricación'
    : 'Preparación';
  const production = activeItems.some(
    (item) =>
      item.timeline.length > 0 ||
      ['IN_PRODUCTION', 'RESERVED', 'READY', 'DELIVERED'].includes(item.status)
  );
  const ready = tracking.orderStatus === 'READY' || tracking.orderStatus === 'COMPLETED';
  const stages = [
    ['Pedido recibido', true],
    [preparationLabel, production],
    ['Listo', ready],
    ['Entrega programada', Boolean(tracking.delivery)],
    [
      'En camino',
      tracking.delivery?.status === 'OUT_FOR_DELIVERY' || tracking.delivery?.status === 'DELIVERED'
    ],
    ['Entregado', tracking.delivery?.status === 'DELIVERED']
  ] as const;
  return (
    <ol aria-label="Resumen global del pedido" className="tracking-progress tracking-global">
      {stages.map(([label, reached], index) => (
        <li key={label} className={reached ? 'is-active' : ''}>
          <span aria-hidden="true">{index + 1}</span>
          {label}
          <span className="sr-only">{reached ? ': registrado' : ': pendiente'}</span>
        </li>
      ))}
    </ol>
  );
}

function PublicTrackingItemCard({ item }: { item: PublicTrackingItem }) {
  const customization = formatCustomization(item.customization);
  return (
    <article className="public-tracking-item">
      <div className="public-item-heading">
        <div>
          <CommerceItemVisual
            imageUrl={item.imageUrlSnapshot}
            name={item.productNameSnapshot}
            variant={item.variantNameSnapshot}
            quantity={item.quantity}
          />
        </div>
        <span className="public-item-status">{publicItemStatusLabel[item.status]}</span>
      </div>
      <dl className="public-item-details">
        {item.skuSnapshot && (
          <>
            <dt>SKU</dt>
            <dd>{item.skuSnapshot}</dd>
          </>
        )}
        <dt>Cantidad</dt>
        <dd>{item.quantity}</dd>
        <dt>Suministro</dt>
        <dd>{publicSupplyTypeLabel[item.supplyType]}</dd>
        {item.expectedCompletionDate && (
          <>
            <dt>Fecha esperada</dt>
            <dd>{formatTrackingDate(item.expectedCompletionDate)}</dd>
          </>
        )}
        {customization.map((entry) => (
          <Fragment key={entry.label}>
            <dt>{entry.label}</dt>
            <dd>{entry.value}</dd>
          </Fragment>
        ))}
      </dl>
      <section className="public-item-timeline">
        <h3>Avances publicados</h3>
        <PublicTrackingTimeline item={item} />
      </section>
    </article>
  );
}

export function PublicOrderTrackingView({ tracking }: { tracking: PublicOrderTracking }) {
  return (
    <main className="public-tracking-page">
      <div className="page-shell public-tracking-shell">
        <header className="public-tracking-heading">
          <p className="eyebrow">Home Fashion</p>
          <h1 className="font-serif text-4xl">Tu pedido</h1>
          <div className="public-order-summary">
            <div>
              <p>Código del pedido</p>
              <strong>{tracking.orderCode}</strong>
            </div>
            <div>
              <p>Estado actual</p>
              <PublicTrackingStatusBadge status={tracking.orderStatus} />
            </div>
          </div>
          <dl>
            <dt>Creado</dt>
            <dd>{formatTrackingDateTime(tracking.createdAt)}</dd>
            {tracking.promisedDate && (
              <>
                <dt>Fecha prometida</dt>
                <dd>{formatTrackingDate(tracking.promisedDate)}</dd>
              </>
            )}
          </dl>
        </header>
        <p className="public-last-update">
          Última actualización pública:{' '}
          {formatTrackingDateTime(tracking.lastPublicUpdateAt ?? tracking.createdAt)}
        </p>
        {tracking.orderStatus !== 'CANCELLED' && <OrderProgress tracking={tracking} />}
        <section className="public-tracking-items" aria-label="Productos del pedido">
          {tracking.items.map((item) => (
            <PublicTrackingItemCard item={item} key={item.publicItemKey} />
          ))}
        </section>
        {tracking.delivery && (
          <section className="admin-section" aria-label="Entrega">
            <h2 className="font-serif text-2xl">Entrega</h2>
            <ol className="tracking-progress">
              {(['SCHEDULED', 'OUT_FOR_DELIVERY', 'DELIVERED'] as const).map((status, index) => (
                <li
                  className={
                    (['SCHEDULED', 'OUT_FOR_DELIVERY', 'DELIVERED'] as const).indexOf(
                      tracking.delivery!.status
                    ) >= index
                      ? 'is-active'
                      : ''
                  }
                  key={status}
                >
                  <span aria-hidden="true">{index + 1}</span>
                  {
                    {
                      SCHEDULED: 'Programada',
                      OUT_FOR_DELIVERY: 'En camino',
                      DELIVERED: 'Entregada'
                    }[status]
                  }
                </li>
              ))}
            </ol>
            <p>Fecha programada: {formatTrackingDate(tracking.delivery.scheduledDate)}</p>
            {tracking.delivery.timeWindow && <p>Franja horaria: {tracking.delivery.timeWindow}</p>}
            {tracking.delivery.deliveredAt && (
              <p>Entregada: {formatTrackingDateTime(tracking.delivery.deliveredAt)}</p>
            )}
            {tracking.delivery.status === 'DELIVERED' && (
              <EvidenceLinks urls={tracking.delivery.evidenceUrls} />
            )}
          </section>
        )}
      </div>
    </main>
  );
}

export function TrackingUnavailable() {
  return (
    <main className="public-tracking-page">
      <div className="page-shell public-tracking-shell">
        <section className="tracking-unavailable">
          <p className="eyebrow">Home Fashion</p>
          <h1 className="font-serif text-4xl">Seguimiento de tu pedido</h1>
          <p>Este enlace de seguimiento no está disponible.</p>
          <p>Solicita a Home Fashion un enlace actualizado.</p>
        </section>
      </div>
    </main>
  );
}
