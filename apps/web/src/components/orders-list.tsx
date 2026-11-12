'use client';
import { LoadingState as AdminSkeleton } from './ui/loading-state';
import { formatDate } from '@/lib/formatters';

import Link from 'next/link';
import { type FormEvent } from 'react';
import { usePageData } from '@/lib/use-page-data';
import { AdminRecordCard } from './admin-record-card';
import { ListError, PageState } from './page-state';
import { useRouter, useSearchParams } from 'next/navigation';
import { orderStatusLabel, type OrderPage, type OrderStatus } from '@/lib/orders';
import { OrderStatusBadge } from './order-status-badge';

const statuses = Object.keys(orderStatusLabel) as OrderStatus[];

export function OrdersList() {
  const router = useRouter();
  const search = useSearchParams();
  const query = search.toString();

  const { page, error, retry } = usePageData<OrderPage>(
    `/api/admin/orders${query ? `?${query}` : ''}`
  );

  function filter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    if (search.get('customerId')) params.set('customerId', search.get('customerId')!);
    for (const key of ['q', 'status', 'dateFrom', 'dateTo']) {
      const value = String(data.get(key) ?? '').trim();
      if (value) params.set(key, value);
    }
    router.push(`/panel/pedidos${params.size ? `?${params}` : ''}`);
  }

  function changePage(next: number) {
    const params = new URLSearchParams(search.toString());
    params.set('page', String(next));
    router.push(`/panel/pedidos?${params}`);
  }

  return (
    <div className="admin-stack">
      <section className="admin-heading">
        <div>
          <p className="eyebrow">Pedidos</p>
          <h1 className="font-serif text-4xl">Pedidos registrados</h1>
          <p>Consulta pedidos creados desde ventas confirmadas.</p>
        </div>
      </section>
      <form key={query} className="admin-filters" onSubmit={filter}>
        <label>
          Buscar
          <input
            defaultValue={search.get('q') ?? ''}
            name="q"
            placeholder="Pedido, venta o cliente"
            type="search"
          />
        </label>
        <label>
          Estado
          <select defaultValue={search.get('status') ?? ''} name="status">
            <option value="">Todos</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {orderStatusLabel[status]}
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
      {!error && !page && <AdminSkeleton label="Cargando pedidos" />}
      {page &&
        (page.data.length ? (
          <>
            <div className="admin-table-wrap admin-desktop">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Pedido</th>
                    <th>Cliente</th>
                    <th>Estado</th>
                    <th>Prometida</th>
                    <th>Unidades</th>
                    <th>Creado</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {page.data.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <strong>{order.code}</strong>
                      </td>
                      <td>{order.customer?.fullName || '—'}</td>
                      <td>
                        <OrderStatusBadge status={order.status} />
                      </td>
                      <td>{order.promisedDate || 'Sin definir'}</td>
                      <td>{order.totalItems ?? '—'}</td>
                      <td>{formatDate(order.createdAt)}</td>
                      <td>
                        <Link className="text-link" href={`/panel/pedidos/${order.id}`}>
                          Ver pedido →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="admin-mobile-cards">
              {page.data.map((order) => (
                <AdminRecordCard
                  key={order.id}
                  title={order.code}
                  subtitle={order.customer?.fullName}
                  badge={<OrderStatusBadge status={order.status} />}
                  actions={
                    <Link className="text-link" href={`/panel/pedidos/${order.id}`}>
                      Ver pedido →
                    </Link>
                  }
                >
                  <dl className="record-values">
                    <div>
                      <dt>Prometida</dt>
                      <dd>{order.promisedDate || 'Sin definir'}</dd>
                    </div>
                    <div>
                      <dt>Unidades</dt>
                      <dd>{order.totalItems ?? '—'}</dd>
                    </div>
                  </dl>
                  <small>Creado: {formatDate(order.createdAt)}</small>
                </AdminRecordCard>
              ))}
            </div>
          </>
        ) : (
          <PageState
            title="No hay pedidos para mostrar"
            action={
              <Link className="button-link" href="/panel/ventas">
                Preparar desde una venta
              </Link>
            }
          >
            <p>Ajusta los filtros o abre una venta confirmada para preparar su pedido.</p>
          </PageState>
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
