import { money } from '@/lib/sales';
import type { SaleDraft } from '@/lib/sale-draft';
import { Button } from '../ui/button';
import { EmptyState } from '../ui/empty-state';
export function SaleDraftItems({
  items,
  disabled,
  onEdit,
  onRemove
}: {
  items: SaleDraft[];
  disabled: boolean;
  onEdit: (index: number) => void;
  onRemove: (index: number) => void;
}) {
  if (!items.length)
    return (
      <EmptyState title="La venta aún no tiene elementos">
        <p>Selecciona un producto y una opción para añadir el primer elemento.</p>
      </EmptyState>
    );
  return (
    <div className="admin-stack">
      {items.map((item, index) => {
        const variant = item.product.variants?.find(
          (variant) => variant.id === item.productVariantId
        );
        const price = item.unitSalePrice ?? (variant ? Number(variant.salePrice) : undefined);
        const discount =
          variant && price !== undefined
            ? Math.max(0, Number(variant.salePrice) - price) * item.quantity
            : undefined;
        return (
          <article className="dense-item-card" key={item.productId + '-' + index}>
            <h3>{item.product.name}</h3>
            <dl>
              <div>
                <dt>Variante</dt>
                <dd>{variant?.name || variant?.sku || 'Personalizado'}</dd>
              </div>
              <div>
                <dt>Cantidad</dt>
                <dd>{item.quantity}</dd>
              </div>
              <div>
                <dt>Precio</dt>
                <dd>{money(price)}</dd>
              </div>
              <div>
                <dt>Descuento estimado</dt>
                <dd>{money(discount)}</dd>
              </div>
              <div>
                <dt>Total estimado</dt>
                <dd>{money(price === undefined ? undefined : price * item.quantity)}</dd>
              </div>
            </dl>
            <small>El servidor confirma los valores al crear la venta.</small>
            <div className="admin-actions">
              <Button variant="secondary" disabled={disabled} onClick={() => onEdit(index)}>
                Editar elemento
              </Button>
              <Button variant="danger" disabled={disabled} onClick={() => onRemove(index)}>
                Eliminar
              </Button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
