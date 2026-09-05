'use client';

import { clientFetch } from '@/lib/client-fetch';
import Link from 'next/link';
import { usePageData } from '@/lib/use-page-data';
import { ListError } from './page-state';
import { useEffect, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  allowedQuoteStatuses,
  money,
  optionalNumber,
  optionalText,
  quoteStatusLabel,
  type CatalogProduct,
  type Customer,
  type Page,
  type Quote,
  type QuoteItem,
  type QuoteStatus,
  type QuoteSummary
} from '@/lib/customer-quote-utils';

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await clientFetch(path, {
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers }
  });
  const body = (await response.json().catch(() => null)) as { message?: string } | null;
  if (!response.ok) throw new Error(body?.message ?? 'No fue posible completar la operación.');
  return body as T;
}

export function FormError({ message }: { message: string | null }) {
  return message ? (
    <p className="form-error" role="alert">
      {message}
    </p>
  ) : null;
}
export function MoneyDisplay({ value }: { value: string | number | null | undefined }) {
  return <span>{money(value)}</span>;
}
export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  return (
    <span className={`admin-status quote-status quote-status-${status.toLowerCase()}`}>
      {quoteStatusLabel[status]}
    </span>
  );
}

type CustomerField =
  | 'fullName'
  | 'documentType'
  | 'documentNumber'
  | 'phone'
  | 'email'
  | 'city'
  | 'neighborhood'
  | 'address'
  | 'notes';
export function CustomerForm({
  customer,
  onSaved
}: {
  customer?: Customer;
  onSaved?: (customer: Customer) => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const fullName = optionalText(form.get('fullName'));
    const phone = optionalText(form.get('phone'));
    if (!fullName || !phone) {
      setError('El nombre y el teléfono son obligatorios.');
      return;
    }
    const payload: Record<string, unknown> = {
      fullName,
      phone,
      documentType: optionalText(form.get('documentType')) ?? null,
      documentNumber: optionalText(form.get('documentNumber')) ?? null,
      email: optionalText(form.get('email'))?.toLowerCase() ?? null,
      city: optionalText(form.get('city')) ?? null,
      neighborhood: optionalText(form.get('neighborhood')) ?? null,
      address: optionalText(form.get('address')) ?? null,
      notes: optionalText(form.get('notes')) ?? null
    };
    if (customer) payload.isActive = form.get('isActive') === 'true';
    if (
      customer &&
      customer.isActive &&
      payload.isActive === false &&
      !window.confirm('¿Desactivar este cliente? Sus datos se conservarán.')
    )
      return;
    setSaving(true);
    setError(null);
    try {
      const saved = await api<Customer>(
        customer ? `/api/admin/customers/${customer.id}` : '/api/admin/customers',
        { method: customer ? 'PATCH' : 'POST', body: JSON.stringify(payload) }
      );
      onSaved?.(saved);
      if (!customer) router.replace(`/panel/clientes/${saved.id}?created=1`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No fue posible guardar el cliente.');
    } finally {
      setSaving(false);
    }
  }
  const value = (field: CustomerField) => customer?.[field] ?? '';
  return (
    <form className="admin-form admin-form-wide" onSubmit={submit}>
      <label>
        Nombre completo
        <input defaultValue={String(value('fullName'))} name="fullName" required />
      </label>
      <label>
        Tipo de documento
        <select defaultValue={String(value('documentType'))} name="documentType">
          <option value="">Sin especificar</option>
          <option value="CC">CC</option>
          <option value="CE">CE</option>
          <option value="NIT">NIT</option>
          <option value="PASSPORT">Pasaporte</option>
          <option value="OTHER">Otro</option>
        </select>
      </label>
      <label>
        Número de documento
        <input defaultValue={String(value('documentNumber'))} name="documentNumber" />
      </label>
      <label>
        Teléfono
        <input defaultValue={String(value('phone'))} name="phone" required />
      </label>
      <label>
        Correo
        <input defaultValue={String(value('email'))} name="email" type="email" />
      </label>
      <label>
        Ciudad
        <input defaultValue={String(value('city'))} name="city" />
      </label>
      <label>
        Barrio
        <input defaultValue={String(value('neighborhood'))} name="neighborhood" />
      </label>
      <label>
        Dirección
        <input defaultValue={String(value('address'))} name="address" />
      </label>
      <label>
        Notas
        <textarea defaultValue={String(value('notes'))} name="notes" />
      </label>
      {customer && (
        <label>
          Estado
          <select defaultValue={customer.isActive ? 'true' : 'false'} name="isActive">
            <option value="true">Activo</option>
            <option value="false">Inactivo</option>
          </select>
        </label>
      )}
      <FormError message={error} />
      <div className="admin-actions">
        <button className="button-link" disabled={saving} type="submit">
          {saving ? 'Guardando…' : 'Guardar cliente'}
        </button>
        <Link className="button-link button-link-secondary" href="/panel/clientes">
          Cancelar
        </Link>
      </div>
    </form>
  );
}

export function CustomerList() {
  const router = useRouter();
  const search = useSearchParams();
  const q = search.get('q') ?? '';
  const isActive = search.get('isActive') ?? '';
  const { page, error, retry } = usePageData<Page<Customer>>(
    `/api/admin/customers?${search.toString()}`
  );
  function filter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    const value = optionalText(data.get('q'));
    const state = optionalText(data.get('isActive'));
    if (value) params.set('q', value);
    if (state) params.set('isActive', state);
    router.push(`/panel/clientes${params.size ? `?${params}` : ''}`);
  }
  const changePage = (next: number) => {
    const params = new URLSearchParams(search.toString());
    params.set('page', String(next));
    router.push(`/panel/clientes?${params}`);
  };
  return (
    <div className="admin-stack">
      <section className="admin-heading">
        <div>
          <p className="eyebrow">Clientes</p>
          <h1 className="font-serif text-4xl">Gestión de clientes</h1>
        </div>
        <Link className="button-link" href="/panel/clientes/nuevo">
          Nuevo cliente
        </Link>
      </section>
      <form key={search.toString()} className="admin-filters" onSubmit={filter}>
        <label>
          Buscar
          <input
            defaultValue={q}
            name="q"
            placeholder="Nombre, documento o teléfono"
            type="search"
          />
        </label>
        <label>
          Estado
          <select defaultValue={isActive} name="isActive">
            <option value="">Todos</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
          </select>
        </label>
        <button className="button-link" type="submit">
          Filtrar
        </button>
      </form>
      {error && <ListError message={error} retry={retry} />}
      {!error && !page && <p className="notice">Cargando clientes…</p>}
      {page &&
        (page.data.length ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Documento</th>
                  <th>Teléfono</th>
                  <th>Correo</th>
                  <th>Ciudad</th>
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {page.data.map((customer) => (
                  <tr key={customer.id}>
                    <td>{customer.fullName}</td>
                    <td>{customer.documentNumber ?? '—'}</td>
                    <td>{customer.phone}</td>
                    <td>{customer.email ?? '—'}</td>
                    <td>{customer.city ?? '—'}</td>
                    <td>
                      <span
                        className={`admin-status ${customer.isActive ? 'admin-status-active' : 'admin-status-inactive'}`}
                      >
                        {customer.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <Link className="text-link" href={`/panel/clientes/${customer.id}`}>
                        Editar
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="notice">No hay clientes que coincidan con los filtros.</p>
        ))}
      {page && page.pagination.totalPages > 1 && (
        <div className="admin-actions">
          <button
            className="button-link button-link-secondary"
            disabled={page.pagination.page <= 1}
            onClick={() => changePage(page.pagination.page - 1)}
          >
            Anterior
          </button>
          <span>
            Página {page.pagination.page} de {page.pagination.totalPages}
          </span>
          <button
            className="button-link button-link-secondary"
            disabled={page.pagination.page >= page.pagination.totalPages}
            onClick={() => changePage(page.pagination.page + 1)}
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}

export function CustomerEditor({ id, created }: { id: string; created: boolean }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<Customer>(`/api/admin/customers/${id}`)
      .then(setCustomer)
      .catch((reason) =>
        setError(reason instanceof Error ? reason.message : 'No fue posible cargar el cliente.')
      );
  }, [id]);
  return (
    <div className="admin-stack">
      <section className="admin-heading">
        <div>
          <Link className="text-link" href="/panel/clientes">
            ← Clientes
          </Link>
          <p className="eyebrow">Clientes</p>
          <h1 className="font-serif text-4xl">Editar cliente</h1>
        </div>
      </section>
      {created && <p className="admin-success">Cliente creado correctamente.</p>}
      <FormError message={error} />
      {customer ? (
        <CustomerForm customer={customer} onSaved={setCustomer} />
      ) : (
        !error && <p className="notice">Cargando cliente…</p>
      )}
      {customer?.quotes && (
        <section className="admin-section">
          <h2 className="font-serif text-2xl">Cotizaciones recientes</h2>
          {customer.quotes.length ? (
            <ul className="quote-history">
              {customer.quotes.map((quote) => (
                <li key={quote.id}>
                  <Link className="text-link" href={`/panel/cotizaciones/${quote.id}`}>
                    {quote.code}
                  </Link>{' '}
                  · <QuoteStatusBadge status={quote.status} /> ·{' '}
                  <MoneyDisplay value={quote.total} />
                </li>
              ))}
            </ul>
          ) : (
            <p>Este cliente aún no tiene cotizaciones.</p>
          )}
        </section>
      )}
    </div>
  );
}

export function QuoteList() {
  const router = useRouter();
  const search = useSearchParams();
  const { page, error, retry } = usePageData<Page<QuoteSummary>>(
    `/api/admin/quotes?${search.toString()}`
  );
  function filter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    for (const key of ['q', 'status']) {
      const value = optionalText(data.get(key));
      if (value) params.set(key, value);
    }
    router.push(`/panel/cotizaciones${params.size ? `?${params}` : ''}`);
  }
  const changePage = (next: number) => {
    const params = new URLSearchParams(search.toString());
    params.set('page', String(next));
    router.push(`/panel/cotizaciones?${params}`);
  };
  return (
    <div className="admin-stack">
      <section className="admin-heading">
        <div>
          <p className="eyebrow">Cotizaciones</p>
          <h1 className="font-serif text-4xl">Cotizaciones</h1>
        </div>
        <Link className="button-link" href="/panel/cotizaciones/nueva">
          Nueva cotización
        </Link>
      </section>
      <form key={search.toString()} className="admin-filters" onSubmit={filter}>
        <label>
          Buscar
          <input
            defaultValue={search.get('q') ?? ''}
            name="q"
            placeholder="Código o cliente"
            type="search"
          />
        </label>
        <label>
          Estado
          <select defaultValue={search.get('status') ?? ''} name="status">
            <option value="">Todos</option>
            {Object.entries(quoteStatusLabel).map(([status, label]) => (
              <option key={status} value={status}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button className="button-link" type="submit">
          Filtrar
        </button>
      </form>
      {error && <ListError message={error} retry={retry} />}
      {!error && !page && <p className="notice">Cargando cotizaciones…</p>}
      {page &&
        (page.data.length ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Cliente</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                  <th>Vigencia</th>
                  <th>Subtotal</th>
                  <th>Descuento</th>
                  <th>Entrega</th>
                  <th>Total</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {page.data.map((quote) => (
                  <tr key={quote.id}>
                    <td>{quote.code}</td>
                    <td>{quote.customer?.fullName ?? '—'}</td>
                    <td>
                      <QuoteStatusBadge status={quote.status} />
                    </td>
                    <td>{new Date(quote.createdAt).toLocaleDateString('es-CO')}</td>
                    <td>
                      {quote.validUntil
                        ? new Date(quote.validUntil).toLocaleDateString('es-CO')
                        : 'Sin definir'}
                    </td>
                    <td>
                      <MoneyDisplay value={quote.subtotal} />
                    </td>
                    <td>
                      <MoneyDisplay value={quote.discountTotal} />
                    </td>
                    <td>
                      <MoneyDisplay value={quote.deliveryFee} />
                    </td>
                    <td>
                      <MoneyDisplay value={quote.total} />
                    </td>
                    <td>
                      <Link className="text-link" href={`/panel/cotizaciones/${quote.id}`}>
                        Abrir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="notice">No hay cotizaciones que coincidan con los filtros.</p>
        ))}
      {page && page.pagination.totalPages > 1 && (
        <div className="admin-actions">
          <button
            className="button-link button-link-secondary"
            disabled={page.pagination.page <= 1}
            onClick={() => changePage(page.pagination.page - 1)}
          >
            Anterior
          </button>
          <span>
            Página {page.pagination.page} de {page.pagination.totalPages}
          </span>
          <button
            className="button-link button-link-secondary"
            disabled={page.pagination.page >= page.pagination.totalPages}
            onClick={() => changePage(page.pagination.page + 1)}
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}

function CustomerPicker({
  selected,
  onSelect
}: {
  selected: string;
  onSelect: (id: string) => void;
}) {
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
  onSaved
}: {
  quote?: Quote;
  onSaved?: (quote: Quote) => void;
}) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState(quote?.customerId ?? '');
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
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [productId, setProductId] = useState(item?.productId ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    api<Page<CatalogProduct>>('/api/admin/quote-products')
      .then((result) => setProducts(result.data))
      .catch((reason) =>
        setError(reason instanceof Error ? reason.message : 'No fue posible cargar productos.')
      );
  }, []);
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
            defaultValue={item?.productId === productId ? (item?.productVariantId ?? '') : ''}
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

export function QuoteItemList({
  quote,
  canOverride,
  refresh
}: {
  quote: Quote;
  canOverride: boolean;
  refresh: () => void;
}) {
  const [editing, setEditing] = useState<QuoteItem | null | 'new'>(null);
  const editable = quote.status === 'REQUESTED' || quote.status === 'DRAFT';
  async function remove(item: QuoteItem) {
    if (!window.confirm('¿Eliminar este elemento de la cotización?')) return;
    try {
      await api(`/api/admin/quotes/${quote.id}/items/${item.id}`, { method: 'DELETE' });
      refresh();
    } catch {
      refresh();
    }
  }
  return (
    <section className="admin-section admin-stack">
      <div className="admin-section-title">
        <div>
          <h2 className="font-serif text-2xl">Elementos</h2>
          <p>Los precios y totales definitivos los calcula el servidor.</p>
        </div>
        {editable && (
          <button className="button-link" onClick={() => setEditing('new')}>
            Añadir elemento
          </button>
        )}
      </div>
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
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>SKU</th>
                <th>Cantidad</th>
                <th>Lista</th>
                <th>Cotizado</th>
                <th>Descuento</th>
                <th>Subtotal</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {quote.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    {item.productNameSnapshot}
                    {item.variantNameSnapshot
                      ? ` · ${item.variantNameSnapshot}`
                      : ' · Personalizado'}
                    {item.customization ? (
                      <small className="item-note">Con personalización</small>
                    ) : null}
                  </td>
                  <td>{item.skuSnapshot ?? '—'}</td>
                  <td>{item.quantity}</td>
                  <td>
                    <MoneyDisplay value={item.unitListPrice} />
                  </td>
                  <td>
                    <MoneyDisplay value={item.unitQuotedPrice} />
                  </td>
                  <td>
                    <MoneyDisplay value={item.discountAmount} />
                  </td>
                  <td>
                    <MoneyDisplay value={item.subtotal} />
                  </td>
                  <td>
                    {editable && (
                      <>
                        <button className="text-link" onClick={() => setEditing(item)}>
                          Editar
                        </button>
                        <button className="text-link" onClick={() => remove(item)}>
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

export function QuoteEditor({ id, canOverride }: { id: string; canOverride: boolean }) {
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
      !window.confirm('Al cotizar, los elementos dejarán de ser editables. ¿Continuar?')
    )
      return;
    try {
      const saved = await api<Quote>(`/api/admin/quotes/${id}/status`, {
        method: 'POST',
        body: JSON.stringify({ status })
      });
      setQuote(saved);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No fue posible cambiar el estado.');
    }
  }
  if (!quote)
    return (
      <>
        <FormError message={error} />
        <p className="notice">Cargando cotización…</p>
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
          Cotización aceptada. Puedes convertirla en venta cuando tengas permiso de ventas.
        </p>
      )}
      {editable ? (
        <QuoteHeaderForm onSaved={setQuote} quote={quote} />
      ) : (
        <section className="admin-section">
          <h2 className="font-serif text-2xl">Detalle</h2>
          <p>
            Vigencia:{' '}
            {quote.validUntil
              ? new Date(quote.validUntil).toLocaleDateString('es-CO')
              : 'Sin definir'}
          </p>
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
      {statuses.length > 0 && (
        <section className="admin-section">
          <h2 className="font-serif text-2xl">Cambiar estado</h2>
          <div className="admin-actions">
            {statuses.map((status) => (
              <button
                className="button-link button-link-secondary"
                key={status}
                onClick={() => changeStatus(status)}
              >
                {quoteStatusLabel[status]}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
