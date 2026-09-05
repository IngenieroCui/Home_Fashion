'use client';

import Link from 'next/link';
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
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Mensaje</th>
                  <th>%</th>
                  <th>Revisión</th>
                  <th>Taller</th>
                  <th>Trabajo</th>
                  <th>Pedido</th>
                  <th>Cliente</th>
                  <th>Producto</th>
                  <th>Cantidad</th>
                  <th>Enviado</th>
                  <th />
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
                      <WorkshopProgressTypeBadge type={report.type} />
                    </td>
                    <td>{report.message}</td>
                    <td>
                      {report.progressPercent ?? '—'}
                      {report.progressPercent === null ? '' : '%'}
                    </td>
                    <td>
                      <ReviewStatusBadge status={report.reviewStatus} />
                      {report.reviewStatus === 'PENDING_REVIEW' && (
                        <small className="item-note">Requiere una decisión</small>
                      )}
                    </td>
                    <td>{report.workshop?.fullName ?? '—'}</td>
                    <td>{report.workshopJob.code}</td>
                    <td>{report.order.code}</td>
                    <td>{report.customer?.fullName ?? '—'}</td>
                    <td>
                      {report.product.name}
                      {report.product.variant ? ` · ${report.product.variant}` : ''}
                    </td>
                    <td>{report.quantity}</td>
                    <td>{formatDateTime(report.submittedAt)}</td>
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
