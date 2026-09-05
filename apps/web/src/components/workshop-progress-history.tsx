import Link from 'next/link';
import { formatDateTime } from '@/lib/workshop-jobs';
import { type WorkshopProgressHistoryEntry } from '@/lib/workshop-progress';
import { ReviewStatusBadge, WorkshopProgressTypeBadge } from './workshop-progress-badges';

export function WorkshopProgressHistory({
  reports,
  canReview
}: {
  reports: WorkshopProgressHistoryEntry[];
  canReview: boolean;
}) {
  return (
    <section className="admin-section">
      <h2 className="font-serif text-2xl">Historial de avances</h2>
      {reports.length ? (
        <div className="payment-history">
          {reports.map((report) => (
            <article className="payment-entry" key={report.id}>
              <div className="admin-section-title">
                <div>
                  <WorkshopProgressTypeBadge type={report.type} />
                  <p>{formatDateTime(report.submittedAt)}</p>
                </div>
                <ReviewStatusBadge status={report.reviewStatus} />
              </div>
              <p>{report.message}</p>
              <p>
                Porcentaje: {report.progressPercent ?? '—'}
                {report.progressPercent === null ? '' : '%'}
              </p>
              {report.reviewComment && <p>Comentario de revisión: {report.reviewComment}</p>}
              {canReview && (
                <Link className="text-link" href={`/panel/talleres/avances/${report.id}`}>
                  Ver reporte
                </Link>
              )}
            </article>
          ))}
        </div>
      ) : (
        <p className="notice">Este trabajo aún no tiene avances registrados.</p>
      )}
    </section>
  );
}
