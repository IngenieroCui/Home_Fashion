'use client';
import type { Dispatch, SetStateAction, FormEvent } from 'react';
import { money, type Product } from '@/lib/sales';
import type { SaleDraft as Draft } from '@/lib/sale-draft';
type Props = {
  editingIndex: number | null;
  editingItem?: Draft;
  product?: Product;
  products: Product[];
  productId: string;
  setProductId: Dispatch<SetStateAction<string>>;
  productQuery: string;
  setProductQuery: Dispatch<SetStateAction<string>>;
  selectedVariantId: string;
  setSelectedVariantId: Dispatch<SetStateAction<string>>;
  canOverride: boolean;
  needsBelowReason: boolean;
  addItem: (event: FormEvent<HTMLFormElement>) => void;
};
export function SaleItemEditor({
  editingIndex,
  editingItem,
  product,
  products,
  productId,
  setProductId,
  productQuery,
  setProductQuery,
  selectedVariantId,
  setSelectedVariantId,
  canOverride,
  needsBelowReason,
  addItem
}: Props) {
  return (
    <form className="admin-form admin-form-wide" key={editingIndex ?? 'new'} onSubmit={addItem}>
      <label>
        Buscar producto
        <input
          onChange={(event) => setProductQuery(event.target.value)}
          placeholder="Buscar producto"
          type="search"
          value={productQuery}
        />
      </label>
      <label>
        Producto
        <select
          onChange={(event) => {
            setProductId(event.target.value);
            setSelectedVariantId('');
          }}
          required
          value={productId}
        >
          <option value="">Selecciona un producto</option>
          {editingItem && !products.some((entry) => entry.id === editingItem.product.id) && (
            <option value={editingItem.product.id}>{editingItem.product.name}</option>
          )}
          {products.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.name}
            </option>
          ))}
        </select>
        {productQuery && !products.length && (
          <small>No se encontraron productos para la búsqueda.</small>
        )}
      </label>
      {product && (
        <label>
          Variante
          <select
            name="productVariantId"
            onChange={(event) => setSelectedVariantId(event.target.value)}
            value={selectedVariantId}
          >
            <option value="">
              {product.allowsCustomization
                ? 'Personalizado sin variante'
                : 'Selecciona una variante'}
            </option>
            {product.variants
              ?.filter((variant) => variant.status !== 'INACTIVE')
              .map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {variant.name ?? variant.sku} · {variant.sku} · {money(variant.salePrice)}
                  {variant.quantityOnHand !== undefined
                    ? ` · Disponible: ${variant.quantityOnHand}`
                    : ''}
                </option>
              ))}
          </select>
        </label>
      )}
      <label>
        Cantidad
        <input
          inputMode="numeric"
          defaultValue={editingItem?.quantity ?? 1}
          min="1"
          name="quantity"
          required
          step="1"
          type="number"
        />
      </label>
      {(canOverride || (product?.allowsCustomization && !selectedVariantId)) && (
        <>
          <label>
            Precio de venta (opcional)
            <input
              inputMode="decimal"
              defaultValue={editingItem?.unitSalePrice ?? ''}
              min="0.01"
              name="unitSalePrice"
              step="0.01"
              type="number"
            />
          </label>
          {canOverride && (
            <label>
              Motivo de negociación
              <input defaultValue={editingItem?.negotiationReason ?? ''} name="negotiationReason" />
            </label>
          )}
          {canOverride && needsBelowReason && (
            <label>
              Motivo de venta bajo costo
              <input
                defaultValue={editingItem?.belowCostReason ?? ''}
                name="belowCostReason"
                required
              />
            </label>
          )}
        </>
      )}
      {product?.allowsCustomization && !selectedVariantId && (
        <>
          <label>
            Dimensiones
            <input defaultValue={editingItem?.customization?.dimensions ?? ''} name="dimensions" />
          </label>
          <label>
            Puestos
            <input defaultValue={editingItem?.customization?.seats ?? ''} name="seats" />
          </label>
          <label>
            Material
            <input defaultValue={editingItem?.customization?.material ?? ''} name="material" />
          </label>
          <label>
            Tela
            <input defaultValue={editingItem?.customization?.fabric ?? ''} name="fabric" />
          </label>
          <label>
            Color
            <input defaultValue={editingItem?.customization?.color ?? ''} name="color" />
          </label>
          <label>
            Acabado
            <input defaultValue={editingItem?.customization?.finish ?? ''} name="finish" />
          </label>
          <label>
            Restricciones de acceso
            <input
              defaultValue={editingItem?.customization?.accessRestrictions ?? ''}
              name="accessRestrictions"
            />
          </label>
          <label>
            Observaciones
            <textarea
              defaultValue={editingItem?.customization?.observations ?? ''}
              name="observations"
            />
          </label>
        </>
      )}
      <label>
        Observaciones del elemento
        <textarea defaultValue={editingItem?.notes ?? ''} name="notes" />
      </label>
      <button className="button-link button-link-secondary" type="submit">
        {editingIndex === null ? 'Añadir elemento' : 'Guardar elemento'}
      </button>
    </form>
  );
}
