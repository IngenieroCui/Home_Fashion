'use client';

import Link from 'next/link';
import { AdminRecordCard } from './admin-record-card';
import { type FormEvent } from 'react';
import { usePageData } from '@/lib/use-page-data';
import { ListError } from './page-state';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatDateTime } from '@/lib/workshop-jobs';
import {
  workshopProgressReviewStatusLabel,
  workshopProgressTypeLabel,
  type WorkshopProgressPage,
  type WorkshopProgressReviewStatus,
  type WorkshopProgressType
} from '@/lib/workshop-progress';
import { ReviewStatusBadge, WorkshopProgressTypeBadge } from './workshop-progress-badges';

const reviewStatuses = Object.keys(
  workshopProgressReviewStatusLabel
) as WorkshopProgressReviewStatus[];
const types = Object.keys(workshopProgressTypeLabel) as WorkshopProgressType[];

export function WorkshopProgressList() {
  const router = useRouter();
  const search = useSearchParams();
  const query = search.toString();
  const { page, error, retry } = usePageData<WorkshopProgressPage>(
    `/api/admin/workshop-progress${query ? `?${query}` : ''}`
  );
  function filter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    for (const key of ['q', 'reviewStatus', 'type', 'dateFrom', 'dateTo']) {
      const value = String(data.get(key) ?? '').trim();
      if (value) params.set(key, value);
    }
    router.push(`/panel/talleres/avances${params.size ? `?${params}` : ''}`);
  }
  function changePage(next: number) {
    const params = new URLSearchParams(search.toString());
    params.set('page', String(next));
    router.push(`/panel/talleres/avances?${params}`);
  }
  return (
    <div className="admin-stack">
      <section className="admin-heading">
        <div>
          <Link className="text-link" href="/panel/talleres">
            ← Talleres
          </Link>
          <p className="eyebrow">Talleres</p>
          <h1 className="font-serif text-4xl">Revisión de avances</h1>
          <p>Los avances pendientes requieren una decisión administrativa.</p>
        </div>
      </section>
      <form key={query} className="admin-filters" onSubmit={filter}>
        <label>
          Buscar
          <input
            defaultValue={search.get('q') ?? ''}
            name="q"
            placeholder="Trabajo, pedido, cliente o producto"
            type="search"
          />
        </label>
        <label>
          Revisión
          <select defaultValue={search.get('reviewStatus') ?? ''} name="reviewStatus">
            <option value="">Todos</option>
            {reviewStatuses.map((status) => (
              <option key={status} value={status}>
                {workshopProgressReviewStatusLabel[status]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tipo
          <select defaultValue={search.get('type') ?? ''} name="type">
            <option value="">Todos</option>
            {types.map((type) => (
              <option key={type} value={type}>
                {workshopProgressTypeLabel[type]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Desde
          <input defaultValue={search.get('dateFrom') ?? ''} name="dateFrom" type="date" />
        </label>
        <label>
          Hasta
          <input defaultValue={search.get('dateTo') ?? ''} name="dateTo" type="date" />
        </label>
        <button className="button-link" type="submit">
          Filtrar
        </button>
      </form>
      {error && <ListError message={error} retry={retry} />}
      {!error && !page && (
        <p className="notice" role="status">
          Cargando avances…
        </p>
      )}
      {page &&
        (page.data.length ? (
          <>
            <div className="admin-mobile-records">
              {page.data.map((report) => (
                <AdminRecordCard
                  key={report.id}
                  title={report.workshopJob.code}
                  subtitle={report.product.name}
                  badge={<ReviewStatusBadge status={report.reviewStatus} />}
                  actions={
                    <Link
                      className="button-link button-link-secondary"
                      href={`/panel/talleres/avances/${report.id}`}
                    >
                      Revisar
                    </Link>
                  }
                >
                  <p>
                    {workshopProgressTypeLabel[report.type]}
                    {report.progressPercent !== null ? ` · ${report.progressPercent}%` : ''}
                  </p>
                  <p>Taller: {report.workshop?.fullName ?? '—'}</p>
                  <p>{formatDateTime(report.submittedAt)}</p>
                </AdminRecordCard>
              ))}
            </div>
            <div className="admin-table-wrap sprint-desktop-table">
              <table className="admin-table progress-review-table">
                <thead>
                  <tr>
                    <th scope="col">Reporte</th>
                    <th scope="col">Revisión</th>
                    <th scope="col">Trabajo y pedido</th>
                    <th scope="col">Cliente y producto</th>
                    <th scope="col">Taller y envío</th>
                    <th scope="col">
                      <span className="sr-only">Acción</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {page.data.map((report) => (
                    <tr
                      className={
                        report.reviewStatus === 'PENDING_REVIEW' ? 'progress-pending-row' : ''
                      }
                      key={report.id}
                    >
                      <td>
                        <span className="progress-review-report">
                          <WorkshopProgressTypeBadge type={report.type} />
                          {report.progressPercent !== null && (
                            <strong>{report.progressPercent}%</strong>
                          )}
                        </span>
                        <small className="item-note">{report.message}</small>
                      </td>
                      <td>
                        <ReviewStatusBadge status={report.reviewStatus} />
                        {report.reviewStatus === 'PENDING_REVIEW' && (
                          <small className="item-note">Requiere una decisión</small>
                        )}
                      </td>
                      <td>
                        <strong>{report.workshopJob.code}</strong>
                        <small className="item-note">{report.order.code}</small>
                      </td>
                      <td>
                        {report.customer?.fullName ?? '—'}
                        <small className="item-note">
                          {report.product.name}
                          {report.product.variant ? ` · ${report.product.variant}` : ''} · Cantidad{' '}
                          {report.quantity}
                        </small>
                      </td>
                      <td>
                        {report.workshop?.fullName ?? '—'}
                        <small className="item-note">{formatDateTime(report.submittedAt)}</small>
                      </td>
                      <td>
                        <Link className="text-link" href={`/panel/talleres/avances/${report.id}`}>
                          Ver detalle
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="notice">No hay avances que coincidan con los filtros.</p>
        ))}
      {page && page.pagination.totalPages > 1 && (
        <div className="admin-actions">
          <button
            className="button-link button-link-secondary"
            disabled={page.pagination.page <= 1}
            onClick={() => changePage(page.pagination.page - 1)}
            type="button"
          >
            Anterior
          </button>
          <span>
            Página {page.pagination.page} de {page.pagination.totalPages}
          </span>
          <button
            className="button-link button-link-secondary"
            disabled={page.pagination.page >= page.pagination.totalPages}
            onClick={() => changePage(page.pagination.page + 1)}
            type="button"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}
