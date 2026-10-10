'use client';
import { useActionFeedback } from '../ui/action-feedback';
import { LoadingState as AdminSkeleton } from '../ui/loading-state';
import { formatDate } from '@/lib/formatters';

import Link from 'next/link';
import { confirmAction } from '@/lib/confirm-action';
import { useEffect, useState } from 'react';
import { ListError } from '../page-state';
import { allowedQuoteStatuses, type Quote, type QuoteStatus } from '@/lib/customer-quote-utils';
import { api, FormError, MoneyDisplay, QuoteStatusBadge } from './quote-shared';
import { QuoteHeaderForm } from './quote-form';
import { QuoteItemList } from './quote-items';
import { QuoteStateActions } from './quote-state-actions';

export function QuoteEditor({ id, canOverride }: { id: string; canOverride: boolean }) {
  const notify = useActionFeedback();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reload = () => {
    setError(null);
    api<Quote>(`/api/admin/quotes/${id}`)
      .then(setQuote)
      .catch((reason) =>
        setError(reason instanceof Error ? reason.message : 'No fue posible cargar la cotización.')
      );
  };
  useEffect(reload, [id]);
  const statuses = quote ? (allowedQuoteStatuses[quote.status] ?? []) : [];
  async function changeStatus(status: QuoteStatus) {
    if (
      status === 'QUOTED' &&
      !(await confirmAction(
        'Al cotizar, los elementos dejarán de ser editables. ¿Continuar?',
        'Cotizar'
      ))
    )
      return;
    try {
      const saved = await api<Quote>(`/api/admin/quotes/${id}/status`, {
        method: 'POST',
        body: JSON.stringify({ status })
      });
      notify('Estado de cotización actualizado');
      setQuote(saved);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No fue posible cambiar el estado.');
    }
  }
  if (!quote)
    return (
      <>
        <FormError message={error} />
        {error ? (
          <ListError message={error} retry={reload} />
        ) : (
          <AdminSkeleton label="Cargando cotización" />
        )}
      </>
    );
  const editable = quote.status === 'REQUESTED' || quote.status === 'DRAFT';
  return (
    <div className="admin-stack">
      <section className="admin-heading">
        <div>
          <Link className="text-link" href="/panel/cotizaciones">
            ← Cotizaciones
          </Link>
          <p className="eyebrow">{quote.code}</p>
          <h1 className="font-serif text-4xl">
            Cotización de {quote.customer?.fullName ?? 'cliente'}
          </h1>
        </div>
        <QuoteStatusBadge status={quote.status} />
      </section>
      <FormError message={error} />
      {quote.status === 'ACCEPTED' && (
        <p className="admin-success">
          Cotización aceptada.
        </p>
      )}
      {editable ? (
        <QuoteHeaderForm onSaved={setQuote} quote={quote} />
      ) : (
        <section className="admin-section">
          <h2 className="font-serif text-2xl">Cliente y propuesta</h2>
          <p>
            {quote.customer?.fullName} · {quote.customer?.phone}
          </p>
          <p>Vigencia: {quote.validUntil ? formatDate(quote.validUntil) : 'Sin definir'}</p>
          <p>Notas para el cliente: {quote.customerNotes ?? '—'}</p>
          <p>Notas internas: {quote.internalNotes ?? '—'}</p>
          <p>
            Costo de entrega: <MoneyDisplay value={quote.deliveryFee} />
          </p>
        </section>
      )}
      <QuoteItemList canOverride={canOverride} quote={quote} refresh={reload} />
      <section className="admin-section quote-totals">
        <h2 className="font-serif text-2xl">Totales calculados por el servidor</h2>
        <p>
          Subtotal <MoneyDisplay value={quote.subtotal} />
        </p>
        <p>
          Descuento <MoneyDisplay value={quote.discountTotal} />
        </p>
        <p>
          Entrega <MoneyDisplay value={quote.deliveryFee} />
        </p>
        <p>
          <strong>
            Total <MoneyDisplay value={quote.total} />
          </strong>
        </p>
      </section>
      <QuoteStateActions statuses={statuses} onChange={changeStatus} />
    </div>
  );
}
