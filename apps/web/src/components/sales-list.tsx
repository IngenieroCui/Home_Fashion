'use client';
import { LoadingState as AdminSkeleton } from './ui/loading-state';
import { formatDate } from '@/lib/formatters';

import Link from 'next/link';
import { type FormEvent } from 'react';
import { usePageData } from '@/lib/use-page-data';
import { AdminRecordCard } from './admin-record-card';
import { PaymentStatusBadge } from './payment-status-badge';
import { ListError, PageState } from './page-state';
import { useRouter, useSearchParams } from 'next/navigation';
import { money, type Page, type Sale } from '@/lib/sales';
export function SalesList() {
  const router = useRouter();
  const search = useSearchParams();
  const query = search.toString();
  const { page, error, retry } = usePageData<Page<Sale>>(
    `/api/admin/sales${query ? `?${query}` : ''}`
  );
  const changePage = (next: number) => {
    const params = new URLSearchParams(search.toString());
    params.set('page', String(next));
    router.push(`/panel/ventas?${params}`);
  };
  function filter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    if (search.get('customerId')) params.set('customerId', search.get('customerId')!);
    for (const key of ['q', 'status', 'dateFrom', 'dateTo']) {
      const value = String(data.get(key) ?? '').trim();
      if (value) params.set(key, value);
    }
    router.push(`/panel/ventas${params.size ? `?${params}` : ''}`);
  }
  return (
    <div className="admin-stack">
      <section className="admin-heading">
        <div>
          <p className="eyebrow">Ventas</p>
          <h1 className="font-serif text-4xl">Ventas registradas</h1>
          <p>Consulta ventas directas y conversiones de cotización.</p>
        </div>
        <Link className="button-link" href="/panel/ventas/nueva">
          Nueva venta
        </Link>
      </section>
      <form key={query} className="admin-filters" onSubmit={filter}>
        <label>
          Buscar
          <input
            defaultValue={search.get('q') ?? ''}
            name="q"
            placeholder="Código o cliente"
            type="search"
          />
        </label>
        <label>
          Estado
          <select defaultValue={search.get('status') ?? ''} name="status">
            <option value="">Todos</option>
            <option value="CONFIRMED">Confirmada</option>
            <option value="CANCELLED">Cancelada</option>
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
      {!error && !page && <AdminSkeleton label="Cargando ventas" />}
      {page &&
        (page.data.length ? (
          <>
            <div className="admin-table-wrap admin-desktop">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Venta</th>
                    <th>Cliente</th>
                    <th>Fecha</th>
                    <th>Origen</th>
                    <th>Total</th>
                    <th>Saldo</th>
                    <th>Estado pago</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {page.data.map((sale) => (
                    <tr key={sale.id}>
                      <td>
                        <strong>{sale.code}</strong>
                        <small className="item-note">
                          {sale.status === 'CONFIRMED' ? 'Confirmada' : 'Cancelada'}
                        </small>
                      </td>
                      <td>{sale.customer?.fullName || '—'}</td>
                      <td>{formatDate(sale.createdAt)}</td>
                      <td>{sale.quoteId ? 'Cotización' : 'Venta directa'}</td>
                      <td>{money(sale.total)}</td>
                      <td>{money(sale.balance)}</td>
                      <td>
                        <PaymentStatusBadge status={sale.paymentStatus} />
                      </td>
                      <td>
                        <Link className="text-link" href={`/panel/ventas/${sale.id}`}>
                          Ver venta →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="admin-mobile-cards">
              {page.data.map((sale) => (
                <AdminRecordCard
                  key={sale.id}
                  title={sale.code}
                  subtitle={sale.customer?.fullName}
                  badge={<PaymentStatusBadge status={sale.paymentStatus} />}
                  actions={
                    <Link className="text-link" href={`/panel/ventas/${sale.id}`}>
                      Ver venta →
                    </Link>
                  }
                >
                  <dl className="record-values">
                    <div>
                      <dt>Total</dt>
                      <dd>{money(sale.total)}</dd>
                    </div>
                    <div>
                      <dt>Pendiente</dt>
                      <dd>{money(sale.balance)}</dd>
                    </div>
                  </dl>
                  <small>
                    {formatDate(sale.createdAt)} · {sale.quoteId ? 'Cotización' : 'Venta directa'} ·{' '}
                    {sale.status === 'CONFIRMED' ? 'Confirmada' : 'Cancelada'}
                  </small>
                </AdminRecordCard>
              ))}
            </div>
          </>
        ) : (
          <PageState
            title="No hay ventas para mostrar"
            action={
              <Link className="button-link" href="/panel/ventas/nueva">
                Nueva venta
              </Link>
            }
          >
            <p>
              Ajusta los filtros, registra una venta directa o convierte una cotización aceptada.
            </p>
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
