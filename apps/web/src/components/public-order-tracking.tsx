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
          {entry.evidenceUrls?.length ? (
            <div className="public-evidence-links">
              {entry.evidenceUrls.map((url, evidenceIndex) => (
                <a
                  href={url}
                  key={`${url}-${evidenceIndex}`}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Abrir evidencia {evidenceIndex + 1}
                </a>
              ))}
            </div>
          ) : null}
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
          <h2 className="font-serif text-2xl">{item.productNameSnapshot}</h2>
          {item.variantNameSnapshot && <p>{item.variantNameSnapshot}</p>}
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
          <h1 className="font-serif text-4xl">Seguimiento de tu pedido</h1>
          <div className="public-order-summary">
            <div>
              <p>Código del pedido</p>
              <strong>{tracking.orderCode}</strong>
            </div>
            <PublicTrackingStatusBadge status={tracking.orderStatus} />
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
        <section className="public-tracking-items" aria-label="Productos del pedido">
          {tracking.items.map((item) => (
            <PublicTrackingItemCard item={item} key={item.publicItemId} />
          ))}
        </section>
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
