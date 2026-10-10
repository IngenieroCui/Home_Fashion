'use client';
import { clientFetch } from '@/lib/client-fetch';
import { normalizeSelectRecord } from '@/lib/select-record';
import Link from 'next/link';
import { SaleCustomerSection } from './sales/sale-customer-section';
import { SaleItemEditor } from './sales/sale-item-editor';
import { SaleDraftItems } from './sales/sale-draft-items';
import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { number, text, type Customer, type Page, type Product } from '@/lib/sales';
import type { SaleDraft as Draft } from '@/lib/sale-draft';
async function api<T>(path: string, init?: RequestInit) {
  const response = await clientFetch(path, {
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers }
  });
  const body = (await response.json().catch(() => null)) as { message?: string } | null;
  if (!response.ok) throw new Error(body?.message ?? 'No fue posible completar la operación.');
  return body as T;
}
export function SaleForm({
  canOverride,
  initialCustomerId
}: {
  canOverride: boolean;
  initialCustomerId?: string;
}) {
  const router = useRouter();
  useEffect(() => {
    if (!initialCustomerId) return;
    let active = true;
    api<Customer>(`/api/admin/customers/${encodeURIComponent(initialCustomerId)}`)
      .then((value) => {
        if (active) setCustomer(normalizeSelectRecord(value));
      })
      .catch(() => {
        if (active) setError('No pudimos seleccionar el cliente. Búscalo nuevamente.');
      });
    return () => {
      active = false;
    };
  }, [initialCustomerId]);
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
    let active = true;
    const timer = setTimeout(() => {
      api<Page<Customer>>(`/api/admin/customers?${params}`)
        .then((result) => {
          if (active) setCustomers(result.data.map(normalizeSelectRecord));
        })
        .catch(
          (reason) =>
            active &&
            setError(reason instanceof Error ? reason.message : 'No fue posible cargar clientes.')
        );
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [customerQuery]);
  useEffect(() => {
    const params = new URLSearchParams();
    if (productQuery) params.set('q', productQuery);
    let active = true;
    const timer = setTimeout(() => {
      api<Page<Product>>(`/api/admin/quote-products?${params}`)
        .then((result) => {
          if (active) setProducts(result.data.map(normalizeSelectRecord));
        })
        .catch(
          (reason) =>
            active &&
            setError(reason instanceof Error ? reason.message : 'No fue posible cargar productos.')
        );
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
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
        <SaleCustomerSection
          customerQuery={customerQuery}
          setCustomerQuery={setCustomerQuery}
          customer={customer}
          setCustomer={setCustomer}
          customers={customers}
        />
        <label>
          Costo de entrega
          <input inputMode="decimal" min="0" name="deliveryFee" step="0.01" type="number" />
        </label>
        <label>
          Notas generales
          <textarea name="notes" />
        </label>
        <button className="button-link" disabled={saving} type="submit">
          {saving ? 'Guardando…' : 'Crear venta'}
        </button>
      </form>
      <section className="admin-section admin-stack sale-item-editor">
        <h2 className="font-serif text-2xl">Añadir elemento</h2>
        <SaleItemEditor
          editingIndex={editingIndex}
          editingItem={editingItem}
          product={product}
          products={products}
          productId={productId}
          setProductId={setProductId}
          productQuery={productQuery}
          setProductQuery={setProductQuery}
          selectedVariantId={selectedVariantId}
          setSelectedVariantId={setSelectedVariantId}
          canOverride={canOverride}
          needsBelowReason={needsBelowReason}
          addItem={addItem}
        />
        <SaleDraftItems
          items={items}
          disabled={saving}
          onEdit={(index) => {
            const item = items[index];
            setEditingIndex(index);
            setProductId(item.productId);
            setSelectedVariantId(item.productVariantId ?? '');
            setProducts((current) =>
              current.some((entry) => entry.id === item.product.id)
                ? current
                : [item.product, ...current]
            );
            requestAnimationFrame(() =>
              document.querySelector<HTMLSelectElement>('.sale-item-editor select')?.focus()
            );
          }}
          onRemove={(index) =>
            setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))
          }
        />
      </section>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
