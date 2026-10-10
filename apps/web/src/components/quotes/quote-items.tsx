'use client';
import { SectionHeader } from '../ui/section-header';
import { useActionFeedback } from '../ui/action-feedback';
import { confirmAction } from '@/lib/confirm-action';
import { useState } from 'react';
import { CommerceItemVisual } from '../commerce-item-visual';
import { type Quote, type QuoteItem } from '@/lib/customer-quote-utils';
import { api, MoneyDisplay, FormError } from './quote-shared';
import { QuoteItemForm } from './quote-item-form';

export function QuoteItemList({
  quote,
  canOverride,
  refresh
}: {
  quote: Quote;
  canOverride: boolean;
  refresh: () => void;
}) {
  const notify = useActionFeedback();
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const [editing, setEditing] = useState<QuoteItem | null | 'new'>(null);
  const editable = quote.status === 'REQUESTED' || quote.status === 'DRAFT';
  async function remove(item: QuoteItem) {
    if (
      !(await confirmAction(
        '¿Eliminar este elemento de la cotización? Esta acción no se puede deshacer.',
        'Eliminar'
      ))
    )
      return;
    setRemoveError(null);
    setRemoving(true);
    try {
      await api(`/api/admin/quotes/${quote.id}/items/${item.id}`, { method: 'DELETE' });
      notify('Elemento eliminado');
      refresh();
    } catch (reason) {
      setRemoveError(reason instanceof Error ? reason.message : 'No pudimos eliminar el elemento.');
    } finally {
      setRemoving(false);
    }
  }
  return (
    <section className="admin-section admin-stack">
      <SectionHeader
        title="Elementos"
        description="Los precios y totales definitivos los calcula el servidor."
        action={
          editable && (
            <button type="button" className="button-link" onClick={() => setEditing('new')}>
              Añadir elemento
            </button>
          )
        }
      />
      <FormError message={removeError} />
      {editing && (
        <QuoteItemForm
          key={editing === 'new' ? 'new' : editing.id}
          canOverride={canOverride}
          item={editing === 'new' ? undefined : editing}
          onCancel={() => setEditing(null)}
          onSaved={refresh}
          quoteId={quote.id}
        />
      )}
      {quote.items?.length ? (
        <div className="admin-table-wrap responsive-item-table">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>SKU</th>
                <th>Cantidad</th>
                <th>Precio catálogo</th>
                <th>Precio acordado</th>
                <th>Descuento</th>
                <th>Subtotal</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {quote.items.map((item) => (
                <tr key={item.id}>
                  <td data-label="Producto">
                    <CommerceItemVisual
                      imageUrl={item.imageUrlSnapshot}
                      name={item.productNameSnapshot}
                      variant={item.variantNameSnapshot ?? 'Personalizado'}
                    />
                    {item.negotiationReason && (
                      <small className="item-note">
                        Motivo de negociación: {item.negotiationReason}
                      </small>
                    )}
                    {item.customization ? (
                      <small className="item-note">Con personalización</small>
                    ) : null}
                  </td>
                  <td data-label="SKU">{item.skuSnapshot ?? '—'}</td>
                  <td data-label="Cantidad">{item.quantity}</td>
                  <td data-label="Precio catálogo">
                    <MoneyDisplay value={item.unitListPrice} />
                  </td>
                  <td data-label="Precio acordado">
                    <MoneyDisplay value={item.unitQuotedPrice} />
                  </td>
                  <td data-label="Descuento">
                    <MoneyDisplay value={item.discountAmount} />
                  </td>
                  <td data-label="Subtotal">
                    <MoneyDisplay value={item.subtotal} />
                  </td>
                  <td data-label="Acciones">
                    {editable && (
                      <>
                        <button className="text-link" onClick={() => setEditing(item)}>
                          Editar
                        </button>
                        <button
                          className="text-link"
                          disabled={removing}
                          onClick={() => remove(item)}
                        >
                          Eliminar
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="notice">
          Aún no hay elementos. Añade una variante o una personalización permitida.
        </p>
      )}
    </section>
  );
}
