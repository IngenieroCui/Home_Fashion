'use client';

import Link from 'next/link';
import { type FormEvent } from 'react';
import { usePageData } from '@/lib/use-page-data';
import { ListError } from './page-state';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  deliveryAssigneeName,
  deliveryStatusLabel,
  deliveryTypeLabel,
  formatDeliveryDate,
  type DeliveryPage,
  type DeliveryStatus,
  type DeliveryType
} from '@/lib/deliveries';
import { DeliveryStatusBadge } from './delivery-status-badge';

const statuses = Object.keys(deliveryStatusLabel) as DeliveryStatus[];
const deliveryTypes = Object.keys(deliveryTypeLabel) as DeliveryType[];

export function DeliveriesList() {
  const router = useRouter();
  const search = useSearchParams();
  const query = search.toString();

  const { page, error, retry } = usePageData<DeliveryPage>(
    `/api/admin/deliveries${query ? `?${query}` : ''}`
  );

  function filter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    for (const key of ['q', 'status', 'deliveryType', 'dateFrom', 'dateTo']) {
      const value = String(data.get(key) ?? '').trim();
      if (value) params.set(key, value);
    }
    router.push(`/panel/entregas${params.size ? `?${params}` : ''}`);
  }

  function changePage(next: number) {
    const params = new URLSearchParams(search.toString());
    params.set('page', String(next));
    router.push(`/panel/entregas?${params}`);
  }

  return (
    <div className="admin-stack">
      <section className="admin-heading">
        <div>
          <p className="eyebrow">Entregas</p>
          <h1 className="font-serif text-4xl">Entregas programadas</h1>
          <p>Programa una entrega desde el detalle de su pedido y gestiona aquí su recorrido.</p>
        </div>
      </section>
      <form key={query} className="admin-filters" onSubmit={filter}>
        <label>
          Buscar
          <input
            defaultValue={search.get('q') ?? ''}
            name="q"
            placeholder="Entrega, pedido, cliente o responsable"
            type="search"
          />
        </label>
        <label>
          Estado
          <select defaultValue={search.get('status') ?? ''} name="status">
            <option value="">Todos</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {deliveryStatusLabel[status]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Responsable
          <select defaultValue={search.get('deliveryType') ?? ''} name="deliveryType">
            <option value="">Todos</option>
            {deliveryTypes.map((type) => (
              <option key={type} value={type}>
                {deliveryTypeLabel[type]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Fecha desde
          <input defaultValue={search.get('dateFrom') ?? ''} name="dateFrom" type="date" />
        </label>
        <label>
          Fecha hasta
          <input defaultValue={search.get('dateTo') ?? ''} name="dateTo" type="date" />
        </label>
        <button className="button-link" type="submit">
          Filtrar
        </button>
      </form>
      {error && <ListError message={error} retry={retry} />}
      {!error && !page && (
        <p className="notice" role="status">
          Cargando entregas…
        </p>
      )}
      {page &&
        (page.data.length ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Pedido</th>
                  <th>Cliente</th>
                  <th>Fecha</th>
                  <th>Responsable</th>
                  <th>Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {page.data.map((delivery) => (
                  <tr key={delivery.id}>
                    <td>{delivery.code}</td>
                    <td>
                      <Link className="text-link" href={`/panel/pedidos/${delivery.order.id}`}>
                        {delivery.order.code}
                      </Link>
                    </td>
                    <td>{delivery.customer?.fullName ?? '—'}</td>
                    <td>
                      {formatDeliveryDate(delivery.scheduledDate)}
                      {delivery.timeWindow ? ` · ${delivery.timeWindow}` : ''}
                    </td>
                    <td>
                      {deliveryAssigneeName(delivery)}
                      <small>{deliveryTypeLabel[delivery.deliveryType]}</small>
                    </td>
                    <td>
                      <DeliveryStatusBadge status={delivery.status} />
                    </td>
                    <td>
                      <Link className="text-link" href={`/panel/entregas/${delivery.id}`}>
                        Ver detalle
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="notice">No hay entregas que coincidan con los filtros.</p>
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
