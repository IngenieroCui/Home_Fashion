'use client';
import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  optionalNumber,
  optionalText,
  type Customer,
  type Page,
  type Quote
} from '@/lib/customer-quote-utils';
import { api, FormError } from './quote-shared';

function CustomerPicker({
  selected,
  onSelect
}: {
  selected: string;
  onSelect: (id: string) => void;
}) {
  const [chosen, setChosen] = useState<Customer | null>(null);
  useEffect(() => {
    if (!selected) {
      setChosen(null);
      return;
    }
    let active = true;
    api<Customer>(`/api/admin/customers/${encodeURIComponent(selected)}`)
      .then((value) => {
        if (active) setChosen(value);
      })
      .catch(() => {
        if (active) setError('No pudimos cargar el cliente seleccionado. Búscalo nuevamente.');
      });
    return () => {
      active = false;
    };
  }, [selected]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<Page<Customer>>(
      `/api/admin/customers?isActive=true${query ? `&q=${encodeURIComponent(query)}` : ''}`
    )
      .then((result) => setCustomers(result.data))
      .catch((reason) =>
        setError(reason instanceof Error ? reason.message : 'No fue posible cargar clientes.')
      );
  }, [query]);
  return (
    <label>
      Cliente
      <select onChange={(event) => onSelect(event.target.value)} required value={selected}>
        <option value="">Selecciona un cliente</option>
        {chosen &&
          chosen.id === selected &&
          !customers.some((customer) => customer.id === chosen.id) && (
            <option value={chosen.id}>
              {chosen.fullName} · {chosen.phone}
            </option>
          )}
        {customers.map((customer) => (
          <option key={customer.id} value={customer.id}>
            {customer.fullName} · {customer.phone}
          </option>
        ))}
      </select>
      {error ? (
        <small>{error}</small>
      ) : (
        <input
          aria-label="Buscar cliente"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar cliente"
          value={query}
        />
      )}
    </label>
  );
}

export function QuoteHeaderForm({
  quote,
  initialCustomerId,
  onSaved
}: {
  quote?: Quote;
  initialCustomerId?: string;
  onSaved?: (quote: Quote) => void;
}) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState(quote?.customerId ?? initialCustomerId ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (!quote && !customerId) {
      setError('Selecciona un cliente.');
      return;
    }
    const deliveryFee = optionalNumber(form.get('deliveryFee'));
    if (deliveryFee !== undefined && deliveryFee < 0) {
      setError('El costo de entrega no puede ser negativo.');
      return;
    }
    const payload = {
      ...(!quote ? { customerId, status: 'DRAFT' } : {}),
      validUntil: optionalText(form.get('validUntil')) ?? null,
      customerNotes: optionalText(form.get('customerNotes')) ?? null,
      internalNotes: optionalText(form.get('internalNotes')) ?? null,
      ...(deliveryFee !== undefined ? { deliveryFee } : {})
    };
    setSaving(true);
    setError(null);
    try {
      const saved = await api<Quote>(
        quote ? `/api/admin/quotes/${quote.id}` : '/api/admin/quotes',
        { method: quote ? 'PATCH' : 'POST', body: JSON.stringify(payload) }
      );
      onSaved?.(saved);
      if (!quote) router.replace(`/panel/cotizaciones/${saved.id}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No fue posible guardar la cotización.');
    } finally {
      setSaving(false);
    }
  }
  return (
    <form className="admin-form admin-form-wide" onSubmit={submit}>
      <h2>{quote ? 'Encabezado' : 'Nueva cotización'}</h2>
      {quote ? (
        <p>
          Cliente: <strong>{quote.customer?.fullName ?? quote.customerId}</strong>
        </p>
      ) : (
        <CustomerPicker onSelect={setCustomerId} selected={customerId} />
      )}
      <label>
        Vigencia
        <input
          defaultValue={quote?.validUntil ? quote.validUntil.slice(0, 10) : ''}
          name="validUntil"
          type="date"
        />
      </label>
      <label>
        Costo de entrega
        <input
          inputMode="decimal"
          defaultValue={quote?.deliveryFee ?? ''}
          min="0"
          name="deliveryFee"
          step="0.01"
          type="number"
        />
      </label>
      <label>
        Notas para el cliente
        <textarea defaultValue={quote?.customerNotes ?? ''} name="customerNotes" />
      </label>
      <label>
        Notas internas
        <textarea defaultValue={quote?.internalNotes ?? ''} name="internalNotes" />
      </label>
      <FormError message={error} />
      <div className="admin-actions">
        <button className="button-link" disabled={saving} type="submit">
          {saving ? 'Guardando…' : quote ? 'Guardar cambios' : 'Crear cotización'}
        </button>
        {!quote && (
          <Link className="button-link button-link-secondary" href="/panel/clientes/nuevo">
            Registrar primero un cliente
          </Link>
        )}
      </div>
    </form>
  );
}
