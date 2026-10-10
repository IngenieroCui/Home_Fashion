'use client';
import { LoadingState as AdminSkeleton } from '../ui/loading-state';
import { formatDate } from '@/lib/formatters';

import Link from 'next/link';
import { usePageData } from '@/lib/use-page-data';
import { type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AdminRecordCard } from '../admin-record-card';
import { ListError, PageState } from '../page-state';
import {
  money,
  optionalText,
  quoteStatusLabel,
  type Page,
  type QuoteSummary
} from '@/lib/customer-quote-utils';
import { MoneyDisplay, QuoteStatusBadge } from './quote-shared';

export function QuoteList() {
  const router = useRouter();
  const search = useSearchParams();
  const { page, error, retry } = usePageData<Page<QuoteSummary>>(
    `/api/admin/quotes?${search.toString()}`
  );
  function filter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    if (search.get('customerId')) params.set('customerId', search.get('customerId')!);
    if (!data.get('status') && search.get('statusGroup') === 'FINALIZED')
      params.set('statusGroup', 'FINALIZED');
    for (const key of ['q', 'status']) {
      const value = optionalText(data.get(key));
      if (value) params.set(key, value);
    }
    router.push(`/panel/cotizaciones${params.size ? `?${params}` : ''}`);
  }
  const changePage = (next: number) => {
    const params = new URLSearchParams(search.toString());
    params.set('page', String(next));
    router.push(`/panel/cotizaciones?${params}`);
  };
  return (
    <div className="admin-stack">
      <section className="admin-heading">
        <div>
          <p className="eyebrow">Cotizaciones</p>
          <h1 className="font-serif text-4xl">Cotizaciones</h1>
        </div>
        <Link className="button-link" href="/panel/cotizaciones/nueva">
          Nueva cotización
        </Link>
      </section>
      <nav className="quote-quick-filters" aria-label="Filtrar cotizaciones">
        {[
          { label: 'Todas', value: '' },
          { label: 'Solicitudes', value: 'REQUESTED' },
          { label: 'Borradores', value: 'DRAFT' },
          { label: 'Cotizadas', value: 'QUOTED' },
          { label: 'Aceptadas', value: 'ACCEPTED' },
          { label: 'Finalizadas', value: 'FINALIZED' }
        ].map((filter) => {
          const params = new URLSearchParams(search.toString());
          params.delete('page');
          params.delete('status');
          params.delete('statusGroup');
          if (filter.value)
            params.set(filter.value === 'FINALIZED' ? 'statusGroup' : 'status', filter.value);
          const selected =
            (search.get('statusGroup') || search.get('status') || '') === filter.value;
          return (
            <Link
              key={filter.value}
              aria-current={selected ? 'page' : undefined}
              href={`/panel/cotizaciones?${params}`}
            >
              {filter.label}
            </Link>
          );
        })}
      </nav>
      <form key={search.toString()} className="admin-filters" onSubmit={filter}>
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
            {Object.entries(quoteStatusLabel).map(([status, label]) => (
              <option key={status} value={status}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button className="button-link" type="submit">
          Filtrar
        </button>
      </form>
      {error && <ListError message={error} retry={retry} />}
      {!error && !page && <AdminSkeleton label="Cargando cotizaciones" />}
      {page &&
        (page.data.length ? (
          <>
            <div className="admin-table-wrap admin-desktop">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Cliente</th>
                    <th>Estado</th>
                    <th>Total</th>
                    <th>Validez</th>
                    <th>Fecha</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {page.data.map((quote) => (
                    <tr key={quote.id}>
                      <td>
                        <strong>{quote.code}</strong>
                      </td>
                      <td>{quote.customer?.fullName || '—'}</td>
                      <td>
                        <QuoteStatusBadge status={quote.status} />
                      </td>
                      <td>
                        <MoneyDisplay value={quote.total} />
                      </td>
                      <td>{quote.validUntil ? formatDate(quote.validUntil) : 'Sin definir'}</td>
                      <td>{formatDate(quote.createdAt)}</td>
                      <td>
                        <Link className="text-link" href={`/panel/cotizaciones/${quote.id}`}>
                          Ver cotización →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="admin-mobile-cards">
              {page.data.map((quote) => (
                <AdminRecordCard
                  key={quote.id}
                  title={quote.code}
                  subtitle={quote.customer?.fullName}
                  badge={<QuoteStatusBadge status={quote.status} />}
                  actions={
                    <Link className="text-link" href={`/panel/cotizaciones/${quote.id}`}>
                      Ver cotización →
                    </Link>
                  }
                >
                  <dl className="record-values">
                    <div>
                      <dt>Total</dt>
                      <dd>{money(quote.total)}</dd>
                    </div>
                    <div>
                      <dt>Vigencia</dt>
                      <dd>{quote.validUntil ? formatDate(quote.validUntil) : 'Sin definir'}</dd>
                    </div>
                  </dl>
                  <small>{formatDate(quote.createdAt)}</small>
                </AdminRecordCard>
              ))}
            </div>
          </>
        ) : (
          <PageState
            title="No hay cotizaciones para mostrar"
            action={
              <Link className="button-link" href="/panel/cotizaciones/nueva">
                Nueva cotización
              </Link>
            }
          >
            <p>Ajusta los filtros o prepara una propuesta para un cliente.</p>
          </PageState>
        ))}
      {page && page.pagination.totalPages > 1 && (
        <div className="admin-actions">
          <button
            className="button-link button-link-secondary"
            disabled={page.pagination.page <= 1}
            onClick={() => changePage(page.pagination.page - 1)}
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
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}
