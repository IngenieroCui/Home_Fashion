'use client';
import { formatDate } from '@/lib/formatters';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { clientFetch } from '@/lib/client-fetch';
import type { OrderPreparation } from '@/lib/operations';
import type { OrderSupplyType } from '@/lib/orders';
import { CommerceItemVisual } from './commerce-item-visual';

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
export function CreateOrderForm({ preparation }: { preparation: OrderPreparation }) {
  const router = useRouter();
  const { sale, items } = preparation;
  const [types, setTypes] = useState<Record<string, OrderSupplyType>>(() =>
    Object.fromEntries(items.map((item) => [item.saleItemId, item.suggestedSupplyType]))
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const promisedDate = String(form.get('promisedDate') || '');
    if (promisedDate && promisedDate < today()) {
      setError('La fecha prometida no puede estar en el pasado.');
      return;
    }
    if (!items.length) {
      setError('La venta no tiene elementos para preparar.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const response = await clientFetch(
        `/api/admin/orders/from-sale/${encodeURIComponent(sale.id)}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            promisedDate: promisedDate || undefined,
            notes: String(form.get('notes') || '').trim() || undefined,
            items: items.map((item) => ({
              saleItemId: item.saleItemId,
              supplyType: types[item.saleItemId],
              notes: String(form.get(`notes-${item.saleItemId}`) || '').trim() || undefined
            }))
          })
        }
      );
      const body = (await response.json().catch(() => null)) as {
        id?: string;
        message?: string;
      } | null;
      if (!response.ok || !body?.id)
        throw new Error(body?.message || 'No fue posible crear el pedido.');
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
      <h1 className="font-serif text-3xl">Preparar pedido de {sale.code}</h1>
      <p>
        {sale.customer.fullName} · {formatDate(sale.createdAt)}
      </p>
      <p className="notice">
        Define cómo atender cada mueble. La disponibilidad se vuelve a comprobar al guardar el
        pedido.
      </p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <label>
        Fecha prometida opcional
        <input name="promisedDate" type="date" min={today()} />
      </label>
      <label>
        Notas generales opcionales
        <textarea name="notes" />
      </label>
      <div className="order-classification">
        {items.map((item) => {
          const stock = item.inventory;
          const enough =
            stock?.variantStatus === 'ACTIVE' && stock.quantityAvailable >= item.quantity;
          return (
            <article className="admin-record-card" key={item.saleItemId}>
              <CommerceItemVisual
                imageUrl={item.imageUrlSnapshot}
                name={item.productNameSnapshot}
                variant={item.variantNameSnapshot}
                quantity={item.quantity}
                meta={<small>{item.skuSnapshot}</small>}
              />
              {stock && (
                <>
                  <h3 className="mt-4 font-semibold">Inventario terminado</h3>
                  <dl className="record-values">
                    <div>
                      <dt>Existencias</dt>
                      <dd>{stock.quantityOnHand}</dd>
                    </div>
                    <div>
                      <dt>Reservadas</dt>
                      <dd>{stock.quantityReserved}</dd>
                    </div>
                    <div>
                      <dt>Disponibles</dt>
                      <dd>{stock.quantityAvailable}</dd>
                    </div>
                    <div>
                      <dt>Ubicación</dt>
                      <dd>{stock.location || 'Sin ubicación'}</dd>
                    </div>
                  </dl>
                  {!enough && (
                    <p className="notice mt-3">
                      {stock.variantStatus !== 'ACTIVE'
                        ? 'La variante está inactiva.'
                        : `Inventario insuficiente para las ${item.quantity} unidades solicitadas.`}
                    </p>
                  )}
                </>
              )}
              {item.productVariantId ? (
                <fieldset className="supply-options">
                  <legend>¿Cómo atenderlo?</legend>
                  <label>
                    <input
                      type="radio"
                      name={`supply-${item.saleItemId}`}
                      value="IN_STOCK"
                      disabled={!enough}
                      checked={types[item.saleItemId] === 'IN_STOCK'}
                      onChange={() =>
                        setTypes((current) => ({ ...current, [item.saleItemId]: 'IN_STOCK' }))
                      }
                    />
                    Reservar inventario
                  </label>
                  <label>
                    <input
                      type="radio"
                      name={`supply-${item.saleItemId}`}
                      value="MADE_TO_ORDER"
                      checked={types[item.saleItemId] === 'MADE_TO_ORDER'}
                      onChange={() =>
                        setTypes((current) => ({ ...current, [item.saleItemId]: 'MADE_TO_ORDER' }))
                      }
                    />
                    Fabricar bajo pedido
                  </label>
                </fieldset>
              ) : (
                <p className="notice mt-4">Producto personalizado. Debe fabricarse bajo pedido.</p>
              )}
              {item.customization && (
                <p>
                  Personalización:{' '}
                  {Object.entries(item.customization)
                    .map(([key, value]) => `${key}: ${String(value)}`)
                    .join(' · ')}
                </p>
              )}
              <label>
                Notas para este mueble
                <textarea name={`notes-${item.saleItemId}`} defaultValue={item.notes || ''} />
              </label>
            </article>
          );
        })}
      </div>
      <div className="admin-actions">
        <button className="button-link" disabled={saving}>
          {saving ? 'Creando pedido…' : 'Crear pedido'}
        </button>
      </div>
    </form>
  );
}
