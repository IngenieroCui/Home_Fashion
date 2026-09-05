'use client';

import { clientFetch } from '@/lib/client-fetch';
import { useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { OrderSupplyType } from '@/lib/orders';
import type { Sale } from '@/lib/sales';

export function CreateOrderForm({ sale }: { sale: Sale }) {
  const router = useRouter();
  const firstUnclassified = useRef<HTMLDivElement | null>(null);
  const items = sale.items ?? [];
  const [types, setTypes] = useState<Record<string, OrderSupplyType | undefined>>(() =>
    Object.fromEntries(
      items.map((item) => [item.id, item.productVariantId ? undefined : 'MADE_TO_ORDER'])
    )
  );
  const [itemNotes, setItemNotes] = useState<Record<string, string>>(() =>
    Object.fromEntries(items.map((item) => [item.id, item.notes ?? '']))
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const unclassified = items.find((item) => item.productVariantId && !types[item.id]);
    if (!items.length || unclassified) {
      setError('Selecciona cómo se atenderá cada elemento antes de crear el pedido.');
      firstUnclassified.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError(null);
    try {
      const response = await clientFetch(
        `/api/admin/orders/from-sale/${encodeURIComponent(sale.id)}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            promisedDate: String(form.get('promisedDate') ?? '').trim() || undefined,
            notes: String(form.get('notes') ?? '').trim() || undefined,
            items: items.map((item) => ({
              saleItemId: item.id,
              supplyType: types[item.id],
              notes: itemNotes[item.id].trim() || undefined
            }))
          })
        }
      );
      const body = (await response.json().catch(() => null)) as {
        id?: string;
        message?: string;
      } | null;
      if (!response.ok) throw new Error(body?.message ?? 'No fue posible crear el pedido.');
      if (!body?.id) throw new Error('La respuesta del pedido fue inesperada.');
      router.replace(`/panel/pedidos/${body.id}`);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No fue posible crear el pedido.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="admin-form admin-form-wide" onSubmit={submit}>
      <h1 className="font-serif text-3xl">Crear pedido de {sale.code}</h1>
      <p className="notice">
        IN_STOCK reserva inventario terminado. MADE_TO_ORDER pasa a fabricación; la disponibilidad
        definitiva se valida al crear.
      </p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <p>
        Cliente: {sale.customer?.fullName ?? '—'} · Venta:{' '}
        {new Date(sale.createdAt).toLocaleDateString('es-CO')}
      </p>
      <label>
        Fecha prometida opcional
        <input name="promisedDate" type="date" />
      </label>
      <label>
        Notas generales opcionales
        <textarea name="notes" />
      </label>
      <div className="order-classification">
        {items.map((item) => {
          const needsClassification = Boolean(item.productVariantId && !types[item.id]);
          return (
            <article
              className="payment-entry"
              key={item.id}
              ref={needsClassification ? firstUnclassified : undefined}
            >
              <strong>
                {item.productNameSnapshot}
                {item.variantNameSnapshot ? ` · ${item.variantNameSnapshot}` : ' · Personalizado'}
              </strong>
              <p>
                SKU: {item.skuSnapshot ?? '—'} · Cantidad: {item.quantity}
              </p>
              {item.customization && (
                <p>
                  Personalización:{' '}
                  {Object.entries(item.customization)
                    .map(([key, value]) => `${key}: ${String(value)}`)
                    .join(' · ')}
                </p>
              )}
              <p className={needsClassification ? 'form-error' : undefined}>
                Selecciona cómo se atenderá este elemento.
              </p>
              <label>
                Tipo de suministro
                <select
                  disabled={!item.productVariantId}
                  onChange={(event) =>
                    setTypes((current) => ({
                      ...current,
                      [item.id]: event.target.value as OrderSupplyType
                    }))
                  }
                  value={types[item.id] ?? ''}
                >
                  {item.productVariantId && <option value="">Selecciona una opción</option>}
                  <option disabled={!item.productVariantId} value="IN_STOCK">
                    Disponible en inventario
                  </option>
                  <option value="MADE_TO_ORDER">Fabricación bajo pedido</option>
                </select>
              </label>
              {!item.productVariantId && (
                <p>Este elemento no tiene variante y debe fabricarse bajo pedido.</p>
              )}
              <label>
                Notas para este elemento del pedido
                <textarea
                  onChange={(event) =>
                    setItemNotes((current) => ({ ...current, [item.id]: event.target.value }))
                  }
                  value={itemNotes[item.id]}
                />
              </label>
            </article>
          );
        })}
      </div>
      <div className="admin-actions">
        <button className="button-link" disabled={saving} type="submit">
          {saving ? 'Creando pedido…' : 'Crear pedido'}
        </button>
      </div>
    </form>
  );
}
