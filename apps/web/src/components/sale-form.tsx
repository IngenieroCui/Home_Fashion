'use client';
import { clientFetch } from '@/lib/client-fetch';
import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { money, number, text, type Customer, type Page, type Product } from '@/lib/sales';
type Draft = {
  productId: string;
  productVariantId?: string;
  quantity: number;
  unitSalePrice?: number;
  customization?: Record<string, string>;
  negotiationReason?: string;
  belowCostReason?: string;
  notes?: string;
  label: string;
  product: Product;
};
async function api<T>(path: string, init?: RequestInit) {
  const response = await clientFetch(path, {
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers }
  });
  const body = (await response.json().catch(() => null)) as { message?: string } | null;
  if (!response.ok) throw new Error(body?.message ?? 'No fue posible completar la operación.');
  return body as T;
}
export function SaleForm({ canOverride }: { canOverride: boolean }) {
  const router = useRouter();
  const [customerQuery, setCustomerQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [productQuery, setProductQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [items, setItems] = useState<Draft[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [needsBelowReason, setNeedsBelowReason] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams({ isActive: 'true' });
    if (customerQuery) params.set('q', customerQuery);
    api<Page<Customer>>(`/api/admin/customers?${params}`)
      .then((result) => setCustomers(result.data))
      .catch((reason) =>
        setError(reason instanceof Error ? reason.message : 'No fue posible cargar clientes.')
      );
  }, [customerQuery]);
  useEffect(() => {
    const params = new URLSearchParams();
    if (productQuery) params.set('q', productQuery);
    api<Page<Product>>(`/api/admin/quote-products?${params}`)
      .then((result) => setProducts(result.data))
      .catch((reason) =>
        setError(reason instanceof Error ? reason.message : 'No fue posible cargar productos.')
      );
  }, [productQuery]);
  const editingItem = editingIndex === null ? undefined : items[editingIndex];
  const product = products.find((entry) => entry.id === productId) ?? editingItem?.product;
  function addItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const variantId = text(form.get('productVariantId'));
    const quantity = number(form.get('quantity'));
    if (!product || !quantity || quantity < 1 || !Number.isInteger(quantity))
      return setError('Selecciona un producto y una cantidad entera válida.');
    if (!variantId && !product.allowsCustomization)
      return setError('Selecciona una variante válida.');
    const price = number(form.get('unitSalePrice'));
    if (price !== undefined && price <= 0) return setError('El precio debe ser mayor que cero.');
    const variant = product.variants?.find((entry) => entry.id === variantId);
    if (variantId && !variant)
      return setError('La variante seleccionada no pertenece al producto.');
    const negotiationReason = text(form.get('negotiationReason'));
    if (
      canOverride &&
      variant &&
      price !== undefined &&
      Number(variant.salePrice) !== price &&
      !negotiationReason
    )
      return setError('Indica el motivo del precio negociado.');
    const customization = !variantId
      ? Object.fromEntries(
          [
            'dimensions',
            'seats',
            'material',
            'fabric',
            'color',
            'finish',
            'observations',
            'accessRestrictions'
          ]
            .map((key) => [key, text(form.get(key))])
            .filter(([, value]) => value)
        )
      : undefined;
    const draft: Draft = {
      productId,
      ...(variantId ? { productVariantId: variantId } : {}),
      quantity,
      ...(price !== undefined ? { unitSalePrice: price } : {}),
      ...(customization && Object.keys(customization).length ? { customization } : {}),
      ...(negotiationReason ? { negotiationReason } : {}),
      ...(text(form.get('belowCostReason'))
        ? { belowCostReason: text(form.get('belowCostReason')) }
        : {}),
      ...(text(form.get('notes')) ? { notes: text(form.get('notes')) } : {}),
      label: `${product.name}${variant ? ` · ${variant.name ?? variant.sku}` : ' · Personalizado'}`,
      product
    };
    setItems((current) =>
      editingIndex === null
        ? [...current, draft]
        : current.map((item, index) => (index === editingIndex ? draft : item))
    );
    event.currentTarget.reset();
    setProductId('');
    setSelectedVariantId('');
    setEditingIndex(null);
    setError(null);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const deliveryFee = number(form.get('deliveryFee'));
    if (!customer) return setError('Selecciona un cliente de los resultados de búsqueda.');
    if (!items.length) return setError('Añade al menos un elemento.');
    if (deliveryFee !== undefined && deliveryFee < 0)
      return setError('El costo de entrega no puede ser negativo.');
    setSaving(true);
    setError(null);
    try {
      const sale = await api<{ id: string }>('/api/admin/sales', {
        method: 'POST',
        body: JSON.stringify({
          customerId: customer.id,
          items: items.map((item) => ({
            productId: item.productId,
            ...(item.productVariantId ? { productVariantId: item.productVariantId } : {}),
            quantity: item.quantity,
            ...(item.unitSalePrice !== undefined ? { unitSalePrice: item.unitSalePrice } : {}),
            ...(item.customization ? { customization: item.customization } : {}),
            ...(item.negotiationReason ? { negotiationReason: item.negotiationReason } : {}),
            ...(item.belowCostReason ? { belowCostReason: item.belowCostReason } : {}),
            ...(item.notes ? { notes: item.notes } : {})
          })),
          ...(deliveryFee !== undefined ? { deliveryFee } : {}),
          ...(text(form.get('notes')) ? { notes: text(form.get('notes')) } : {})
        })
      });
      router.replace(`/panel/ventas/${sale.id}`);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'No fue posible crear la venta.';
      setError(message);
      if (/below cost|debajo del costo/i.test(message)) setNeedsBelowReason(true);
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="admin-stack">
      <section className="admin-heading">
        <div>
          <Link className="text-link" href="/panel/ventas">
            ← Ventas
          </Link>
          <p className="eyebrow">Ventas</p>
          <h1 className="font-serif text-4xl">Nueva venta directa</h1>
        </div>
      </section>
      <form className="admin-form admin-form-wide" onSubmit={submit}>
        <label>
          Buscar cliente
          <input
            onChange={(event) => setCustomerQuery(event.target.value)}
            placeholder="Nombre, documento o teléfono"
            type="search"
            value={customerQuery}
          />
        </label>
        <label>
          Cliente seleccionado
          <select
            onChange={(event) =>
              setCustomer(customers.find((entry) => entry.id === event.target.value) ?? customer)
            }
            required
            value={customer?.id ?? ''}
          >
            <option value="">Selecciona un cliente</option>
            {customer && !customers.some((entry) => entry.id === customer.id) && (
              <option value={customer.id}>{customer.fullName}</option>
            )}
            {customers.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.fullName} · {entry.documentNumber ?? 'Sin documento'} ·{' '}
                {entry.phone ?? 'Sin teléfono'}
              </option>
            ))}
          </select>
          {customerQuery && !customers.length && (
            <small>No se encontraron clientes para la búsqueda.</small>
          )}
        </label>
        <Link className="text-link" href="/panel/clientes/nuevo">
          Registrar nuevo cliente
        </Link>
        <label>
          Costo de entrega
          <input min="0" name="deliveryFee" step="0.01" type="number" />
        </label>
        <label>
          Notas generales
          <textarea name="notes" />
        </label>
        <button className="button-link" disabled={saving} type="submit">
          {saving ? 'Guardando…' : 'Crear venta'}
        </button>
      </form>
      <section className="admin-section admin-stack">
        <h2 className="font-serif text-2xl">Añadir elemento</h2>
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
                  <input
                    defaultValue={editingItem?.negotiationReason ?? ''}
                    name="negotiationReason"
                  />
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
                <input
                  defaultValue={editingItem?.customization?.dimensions ?? ''}
                  name="dimensions"
                />
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
        {items.length ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Elemento</th>
                  <th>Cantidad</th>
                  <th>Precio solicitado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={`${item.productId}-${index}`}>
                    <td>{item.label}</td>
                    <td>{item.quantity}</td>
                    <td>
                      {item.unitSalePrice === undefined
                        ? 'Precio de catálogo'
                        : money(item.unitSalePrice)}
                    </td>
                    <td>
                      <button
                        className="text-link"
                        onClick={() => {
                          setEditingIndex(index);
                          setProductId(item.productId);
                          setSelectedVariantId(item.productVariantId ?? '');
                          setProducts((current) =>
                            current.some((entry) => entry.id === item.product.id)
                              ? current
                              : [item.product, ...current]
                          );
                        }}
                        type="button"
                      >
                        Editar
                      </button>
                      <button
                        className="text-link"
                        onClick={() =>
                          setItems((current) =>
                            current.filter((_, itemIndex) => itemIndex !== index)
                          )
                        }
                        type="button"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="notice">Aún no hay elementos en la venta.</p>
        )}
      </section>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
