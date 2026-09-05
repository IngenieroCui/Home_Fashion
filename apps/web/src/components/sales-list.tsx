'use client';
import Link from 'next/link';
import { type FormEvent } from 'react';
import { usePageData } from '@/lib/use-page-data';
import { ListError } from './page-state';
import { useRouter, useSearchParams } from 'next/navigation';
import { money, paymentStatusLabel, type Page, type Sale } from '@/lib/sales';
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
      {!error && !page && (
        <p className="notice" role="status">
          Cargando ventas…
        </p>
      )}
      {page &&
        (page.data.length ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Cliente</th>
                  <th>Fecha</th>
                  <th>Origen</th>
                  <th>Estado</th>
                  <th>Subtotal</th>
                  <th>Descuento</th>
                  <th>Entrega</th>
                  <th>Total</th>
                  <th>Pagado</th>
                  <th>Saldo</th>
                  <th>Pago</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {page.data.map((sale) => (
                  <tr key={sale.id}>
                    <td>{sale.code}</td>
                    <td>{sale.customer?.fullName ?? '—'}</td>
                    <td>{new Date(sale.createdAt).toLocaleDateString('es-CO')}</td>
                    <td>{sale.quoteId ? 'Cotización' : 'Venta directa'}</td>
                    <td>{sale.status === 'CONFIRMED' ? 'Confirmada' : 'Cancelada'}</td>
                    <td>{money(sale.subtotal)}</td>
                    <td>{money(sale.discountTotal)}</td>
                    <td>{money(sale.deliveryFee)}</td>
                    <td>{money(sale.total)}</td>
                    <td>{money(sale.amountPaid)}</td>
                    <td>{money(sale.balance)}</td>
                    <td>{sale.paymentStatus ? paymentStatusLabel[sale.paymentStatus] : '—'}</td>
                    <td>
                      <Link className="text-link" href={`/panel/ventas/${sale.id}`}>
                        Ver detalle
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="notice">No hay ventas que coincidan con los filtros.</p>
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
