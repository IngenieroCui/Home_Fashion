'use client';

import Link from 'next/link';
import { usePageData } from '@/lib/use-page-data';
import type { Page, QuoteSummary } from '@/lib/customer-quote-utils';
import type { OrderPage } from '@/lib/orders';

function QuoteInbox() {
  const { page, error, retry } = usePageData<Page<QuoteSummary>>(
    '/api/admin/quotes?status=REQUESTED&limit=5'
  );
  return (
    <section className="admin-section">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Atención comercial</p>
          <h2 className="font-serif text-2xl">Solicitudes por atender</h2>
        </div>
        <Link className="text-link" href="/panel/cotizaciones?status=REQUESTED">
          Ver cotizaciones ↗
        </Link>
      </div>
      {error ? (
        <button className="text-link mt-4" onClick={retry} type="button">
          No pudimos cargar las solicitudes. Reintentar
        </button>
      ) : !page ? (
        <p className="mt-4 text-sm">Cargando solicitudes…</p>
      ) : (
        <>
          <p className="mt-4 text-sm text-[#67574d]">
            {page.pagination.total} pendiente{page.pagination.total === 1 ? '' : 's'} de revisión.
          </p>
          {page.data.length ? (
            <ul className="mt-4 grid gap-3">
              {page.data.map((quote) => (
                <li className="rounded-lg border border-[#ddcfbc] bg-[#fffdf8] p-3" key={quote.id}>
                  <Link
                    className="flex flex-wrap justify-between gap-2 font-semibold text-[#3d291e]"
                    href={`/panel/cotizaciones/${quote.id}`}
                  >
                    <span>
                      {quote.code} · {quote.customer?.fullName ?? 'Cliente'}
                    </span>
                    <span className="text-[#a64b32]">Revisar ↗</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="notice mt-4">No hay solicitudes pendientes.</p>
          )}
        </>
      )}
    </section>
  );
}

function OpenOrders() {
  const { page, error, retry } = usePageData<OrderPage>('/api/admin/orders?status=OPEN&limit=5');
  return (
    <section className="admin-section">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Operación</p>
          <h2 className="font-serif text-2xl">Pedidos por iniciar</h2>
        </div>
        <Link className="text-link" href="/panel/pedidos?status=OPEN">
          Ver pedidos ↗
        </Link>
      </div>
      {error ? (
        <button className="text-link mt-4" onClick={retry} type="button">
          No pudimos cargar los pedidos. Reintentar
        </button>
      ) : !page ? (
        <p className="mt-4 text-sm">Cargando pedidos…</p>
      ) : (
        <>
          <p className="mt-4 text-sm text-[#67574d]">
            {page.pagination.total} abierto{page.pagination.total === 1 ? '' : 's'} para coordinar.
          </p>
          {page.data.length ? (
            <ul className="mt-4 grid gap-3">
              {page.data.map((order) => (
                <li className="rounded-lg border border-[#ddcfbc] bg-[#fffdf8] p-3" key={order.id}>
                  <Link
                    className="flex flex-wrap justify-between gap-2 font-semibold text-[#3d291e]"
                    href={`/panel/pedidos/${order.id}`}
                  >
                    <span>
                      {order.code} · {order.customer?.fullName ?? 'Cliente'}
                    </span>
                    <span className="text-[#a64b32]">Abrir ↗</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="notice mt-4">No hay pedidos abiertos.</p>
          )}
        </>
      )}
    </section>
  );
}

export function OperationalSummary({
  canQuotes,
  canOrders
}: {
  canQuotes: boolean;
  canOrders: boolean;
}) {
  if (!canQuotes && !canOrders) return null;
  return (
    <section aria-label="Trabajo pendiente" className="mt-8 grid gap-4 lg:grid-cols-2">
      {canQuotes && <QuoteInbox />}
      {canOrders && <OpenOrders />}
    </section>
  );
}
