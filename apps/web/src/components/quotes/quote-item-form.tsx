'use client';
import { useActionFeedback } from '../ui/action-feedback';
import { normalizeSelectRecord } from '@/lib/select-record';
import { useEffect, useState, type FormEvent } from 'react';
import {
  money,
  optionalNumber,
  optionalText,
  type CatalogProduct,
  type Page,
  type QuoteItem
} from '@/lib/customer-quote-utils';
import { api, FormError } from './quote-shared';

function itemPayload(form: FormData, product: CatalogProduct | undefined, canOverride: boolean) {
  const productId = optionalText(form.get('productId'));
  const variantId = optionalText(form.get('productVariantId'));
  const quantity = optionalNumber(form.get('quantity'));
  if (!productId || !product || !quantity || quantity < 1 || !Number.isInteger(quantity))
    throw new Error('Selecciona un producto y una cantidad válida.');
  const custom = !variantId;
  if (custom && !product.allowsCustomization)
    throw new Error('Este producto requiere seleccionar una variante.');
  const unitQuotedPrice = optionalNumber(form.get('unitQuotedPrice'));
  if (unitQuotedPrice !== undefined && unitQuotedPrice <= 0)
    throw new Error('El precio cotizado debe ser mayor que cero.');
  const selectedVariant = product.variants?.find((variant) => variant.id === variantId);
  if (variantId && !selectedVariant)
    throw new Error('Selecciona una variante válida del producto.');
  const changed =
    !!selectedVariant &&
    unitQuotedPrice !== undefined &&
    Number(unitQuotedPrice) !== Number(selectedVariant.salePrice);
  const negotiationReason = optionalText(form.get('negotiationReason'));
  if (changed && !canOverride) throw new Error('No tienes permiso para negociar el precio.');
  if (changed && !negotiationReason) throw new Error('Indica el motivo del precio negociado.');
  const customization = product.allowsCustomization
    ? Object.fromEntries(
        [
          'dimensions',
          'seats',
          'material',
          'fabric',
          'color',
          'finish',
          'observations',
          'details',
          'accessRestrictions'
        ]
          .map((key) => [key, optionalText(form.get(key))])
          .filter(([, value]) => value)
      )
    : undefined;
  return {
    productId,
    ...(variantId ? { productVariantId: variantId } : {}),
    quantity,
    ...(unitQuotedPrice !== undefined ? { unitQuotedPrice } : {}),
    ...(customization && Object.keys(customization).length ? { customization } : {}),
    ...(negotiationReason ? { negotiationReason } : {}),
    ...(optionalText(form.get('notes')) ? { notes: optionalText(form.get('notes')) } : {})
  };
}

export function QuoteItemForm({
  quoteId,
  item,
  canOverride,
  onSaved,
  onCancel
}: {
  quoteId: string;
  item?: QuoteItem;
  canOverride: boolean;
  onSaved: () => void;
  onCancel?: () => void;
}) {
  const notify = useActionFeedback();
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [productId, setProductId] = useState(item?.productId != null ? String(item.productId) : '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState(item?.productNameSnapshot ?? '');
  useEffect(() => {
    const params = new URLSearchParams({ limit: '50' });
    if (query.trim()) params.set('q', query.trim());
    let active = true;
    api<Page<CatalogProduct>>(`/api/admin/quote-products?${params}`)
      .then((result) => { if (active) setProducts(result.data.map(normalizeSelectRecord)); })
      .catch((reason) =>
        active && setError(reason instanceof Error ? reason.message : 'No fue posible cargar productos.')
      );
    return () => { active = false; };
  }, [query]);
  const product = products.find((entry) => entry.id === productId);
  const defaultCustomization = item?.customization ?? {};
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const body = itemPayload(new FormData(event.currentTarget), product, canOverride);
      setSaving(true);
      setError(null);
      await api<QuoteItem>(
        item
          ? `/api/admin/quotes/${quoteId}/items/${item.id}`
          : `/api/admin/quotes/${quoteId}/items`,
        { method: item ? 'PATCH' : 'POST', body: JSON.stringify(body) }
      );
      notify('Elemento guardado');
      onSaved();
      onCancel?.();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No fue posible guardar el elemento.');
    } finally {
      setSaving(false);
    }
  }
  const custom = product?.allowsCustomization;
  return (
    <form className="admin-form admin-form-wide" onSubmit={submit}>
      <h3>{item ? 'Editar elemento' : 'Añadir elemento'}</h3>
      <label>
        Buscar producto
        <input type="search" value={query} onChange={(event) => {
          setQuery(event.target.value);
          setProductId('');
        }} />
      </label>
      <label>
        Producto
        <select
          name="productId"
          onChange={(event) => setProductId(event.target.value)}
          required
          value={productId}
        >
          <option value="">Selecciona un producto</option>
          {products.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.name}
            </option>
          ))}
        </select>
      </label>
      {product && (
        <label>
          Variante
          <select
            key={productId}
            defaultValue={item?.productId != null && String(item.productId) === productId ? String(item.productVariantId ?? '') : ''}
            name="productVariantId"
          >
            <option value="">
              {product.allowsCustomization
                ? 'Personalizado sin variante'
                : 'Selecciona una variante'}
            </option>
            {product.variants?.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.name ?? variant.sku} · {variant.sku} · {money(variant.salePrice)}
              </option>
            ))}
          </select>
        </label>
      )}
      <label>
        Cantidad
        <input
          inputMode="numeric"
          defaultValue={item?.quantity ?? 1}
          min="1"
          name="quantity"
          required
          step="1"
          type="number"
        />
      </label>
      {(!product || product.allowsCustomization || canOverride) && (
        <label>
          Precio cotizado (opcional)
          <input
            inputMode="decimal"
            defaultValue={item?.unitQuotedPrice ?? ''}
            min="0.01"
            name="unitQuotedPrice"
            step="0.01"
            type="number"
          />
        </label>
      )}
      {canOverride && (
        <label>
          Motivo de negociación
          <input defaultValue={item?.negotiationReason ?? ''} name="negotiationReason" />
        </label>
      )}
      {custom && (
        <>
          <label>
            Dimensiones
            <input defaultValue={String(defaultCustomization.dimensions ?? '')} name="dimensions" />
          </label>
          <label>
            Puestos
            <input defaultValue={String(defaultCustomization.seats ?? '')} name="seats" />
          </label>
          <label>
            Material
            <input defaultValue={String(defaultCustomization.material ?? '')} name="material" />
          </label>
          <label>
            Tela
            <input defaultValue={String(defaultCustomization.fabric ?? '')} name="fabric" />
          </label>
          <label>
            Color
            <input defaultValue={String(defaultCustomization.color ?? '')} name="color" />
          </label>
          <label>
            Acabado
            <input defaultValue={String(defaultCustomization.finish ?? '')} name="finish" />
          </label>
          <label>
            Restricciones de acceso
            <input
              defaultValue={String(defaultCustomization.accessRestrictions ?? '')}
              name="accessRestrictions"
            />
          </label>
          <label>
            Observaciones
            <textarea
              defaultValue={String(defaultCustomization.observations ?? '')}
              name="observations"
            />
          </label>
          <label>
            Detalles solicitados por el cliente
            <textarea defaultValue={String(defaultCustomization.details ?? '')} name="details" />
          </label>
        </>
      )}
      <label>
        Notas
        <textarea defaultValue={item?.notes ?? ''} name="notes" />
      </label>
      <FormError message={error} />
      <div className="admin-actions">
        <button className="button-link" disabled={saving} type="submit">
          {saving ? 'Guardando…' : 'Guardar elemento'}
        </button>
        {onCancel && (
          <button className="button-link button-link-secondary" onClick={onCancel} type="button">
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
