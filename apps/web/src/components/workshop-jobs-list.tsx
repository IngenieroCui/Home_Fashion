'use client';

import Link from 'next/link';
import { AdminRecordCard } from './admin-record-card';
import { CommerceItemVisual } from './commerce-item-visual';
import { type FormEvent } from 'react';
import { usePageData } from '@/lib/use-page-data';
import { ListError } from './page-state';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  formatDate,
  formatDateTime,
  workshopJobStatusLabel,
  type WorkshopJobPage,
  type WorkshopJobStatus
} from '@/lib/workshop-jobs';
import { WorkshopJobStatusBadge } from './workshop-job-status-badge';

const statuses = Object.keys(workshopJobStatusLabel) as WorkshopJobStatus[];

export function WorkshopJobsList() {
  const router = useRouter();
  const search = useSearchParams();
  const query = search.toString();
  const { page, error, retry } = usePageData<WorkshopJobPage>(
    `/api/admin/workshop-jobs${query ? `?${query}` : ''}`
  );

  function filter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    for (const key of ['q', 'status', 'expectedDateFrom', 'expectedDateTo']) {
      const value = String(data.get(key) ?? '').trim();
      if (value) params.set(key, value);
    }
    router.push(`/panel/talleres/trabajos${params.size ? `?${params}` : ''}`);
  }

  function changePage(next: number) {
    const params = new URLSearchParams(search.toString());
    params.set('page', String(next));
    router.push(`/panel/talleres/trabajos?${params}`);
  }

  return (
    <div className="admin-stack">
      <section className="admin-heading">
        <div>
          <Link className="text-link" href="/panel/talleres">
            ← Talleres
          </Link>
          <p className="eyebrow">Talleres</p>
          <h1 className="font-serif text-4xl">Trabajos asignados</h1>
          <p>Consulta las asignaciones registradas; esta vista no modifica su estado.</p>
        </div>
      </section>
      <form key={query} className="admin-filters" onSubmit={filter}>
        <label>
          Buscar
          <input
            defaultValue={search.get('q') ?? ''}
            name="q"
            placeholder="Trabajo, pedido, cliente o taller"
            type="search"
          />
        </label>
        <label>
          Estado
          <select defaultValue={search.get('status') ?? ''} name="status">
            <option value="">Todos</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {workshopJobStatusLabel[status]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Fecha esperada desde
          <input
            defaultValue={search.get('expectedDateFrom') ?? ''}
            name="expectedDateFrom"
            type="date"
          />
        </label>
        <label>
          Fecha esperada hasta
          <input
            defaultValue={search.get('expectedDateTo') ?? ''}
            name="expectedDateTo"
            type="date"
          />
        </label>
        <button className="button-link" type="submit">
          Filtrar
        </button>
      </form>
      {error && <ListError message={error} retry={retry} />}
      {!error && !page && (
        <p className="notice" role="status">
          Cargando trabajos…
        </p>
      )}
      {page &&
        (page.data.length ? (
          <>
          <div className="admin-mobile-records">{page.data.map((job) => <AdminRecordCard key={job.id} title={job.code} subtitle={job.workshopUser.fullName} badge={<WorkshopJobStatusBadge status={job.status} />} actions={<Link className="button-link button-link-secondary" href={`/panel/talleres/trabajos/${job.id}`}>Ver trabajo</Link>}><CommerceItemVisual imageUrl={job.imageUrlSnapshot} name={job.productNameSnapshot} variant={job.variantNameSnapshot} quantity={job.quantity} /><p>Pedido: {job.orderCode}</p><p>Fecha esperada: {formatDate(job.expectedCompletionDate)}</p></AdminRecordCard>)}</div>
          <div className="admin-table-wrap sprint-desktop-table">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Taller</th>
                  <th>Pedido</th>
                  <th>Cliente</th>
                  <th>Producto</th>
                  <th>Cantidad</th>
                  <th>Estado</th>
                  <th>Esperada</th>
                  <th>Asignado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {page.data.map((job) => (
                  <tr key={job.id}>
                    <td>{job.code}</td>
                    <td>{job.workshopUser.fullName}</td>
                    <td>{job.orderCode}</td>
                    <td>{job.customer?.fullName ?? '—'}</td>
                    <td>
                      {job.productNameSnapshot}
                      {job.variantNameSnapshot ? ` · ${job.variantNameSnapshot}` : ''}
                    </td>
                    <td>{job.quantity}</td>
                    <td>
                      <WorkshopJobStatusBadge status={job.status} />
                    </td>
                    <td>{formatDate(job.expectedCompletionDate)}</td>
                    <td>{formatDateTime(job.assignedAt)}</td>
                    <td>
                      <Link className="text-link" href={`/panel/talleres/trabajos/${job.id}`}>
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
          <p className="notice">No hay trabajos que coincidan con los filtros.</p>
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
