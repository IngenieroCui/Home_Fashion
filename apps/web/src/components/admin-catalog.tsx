'use client';
/* eslint-disable @next/next/no-img-element -- Image URLs are administratively supplied and no remote optimizer is configured. */

import { clientFetch } from '@/lib/client-fetch';
import Link from 'next/link';
import { ListError } from './page-state';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { adminCatalogQuery, formNumber } from '@/lib/admin-catalog-utils';

type Status = 'ACTIVE' | 'INACTIVE';
type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  productCount?: number;
};
type Image = { id: string; url: string; altText: string | null; isPrimary: boolean };
type Variant = {
  id: string;
  sku: string;
  name: string | null;
  dimensions: string | null;
  material: string | null;
  color: string | null;
  fabric: string | null;
  finish: string | null;
  salePrice: string;
  estimatedCost: string | null;
  quantityOnHand: number;
  quantityReserved: number;
  location: string | null;
  status: Status;
  images?: Image[];
};
type Product = {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string;
  allowsCustomization: boolean;
  status: Status;
  category?: Category;
  variants?: Variant[];
  images?: Image[];
  primaryImage?: Image | null;
  variantCount?: number;
};
type Page<T> = { data: T[]; pagination: { page: number; totalPages: number; total: number } };

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await clientFetch(path, {
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers }
  });
  if (response.status === 401) window.location.assign('/iniciar-sesion');
  const body = (await response.json().catch(() => ({}))) as T & { message?: string };
  if (!response.ok) throw new Error(body.message ?? 'No fue posible completar la operación.');
  return body;
}

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={`admin-status ${status === 'ACTIVE' ? 'admin-status-active' : 'admin-status-inactive'}`}
    >
      {status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
    </span>
  );
}
function ErrorMessage({ message }: { message: string | null }) {
  return message ? (
    <p className="form-error" role="alert">
      {message}
    </p>
  ) : null;
}
const money = (value: string) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(Number(value));

export function CatalogDashboard() {
  const router = useRouter();
  const search = useSearchParams();
  const [products, setProducts] = useState<Page<Product> | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const query = search.toString();
  useEffect(() => {
    let active = true;
    setError(null);
    setProducts(null);
    Promise.all([
      api<Page<Product>>(`/api/admin/catalog/products${query ? `?${query}` : ''}`),
      api<Page<Category>>('/api/admin/catalog/categories?limit=50')
    ])
      .then(([productResult, categoryResult]) => {
        if (active) {
          setProducts(productResult);
          setCategories(categoryResult.data);
        }
      })
      .catch(
        (reason: unknown) =>
          active &&
          setError(reason instanceof Error ? reason.message : 'No fue posible cargar el catálogo.')
      );
    return () => {
      active = false;
    };
  }, [query, reloadKey]);
  function submitFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    router.push(
      `/panel/catalogo${(() => {
        const q = adminCatalogQuery({
          q: String(fields.get('q') ?? ''),
          categoryId: String(fields.get('categoryId') ?? ''),
          status: String(fields.get('status') ?? ''),
          allowsCustomization: String(fields.get('allowsCustomization') ?? '')
        });
        return q ? `?${q}` : '';
      })()}`
    );
  }
  const filter = (name: string) => search.get(name) ?? '';
  return (
    <div className="admin-stack">
      <section className="admin-heading">
        <div>
          <p className="eyebrow">Administración</p>
          <h1 className="font-serif text-4xl">Catálogo</h1>
          <p>Gestiona productos, variantes, estado e inventario terminado.</p>
        </div>
        <Link className="button-link" href="/panel/catalogo/nuevo">
          Nuevo producto
        </Link>
      </section>
      <form className="admin-filters" onSubmit={submitFilters}>
        <label>
          Buscar
          <input
            defaultValue={filter('q')}
            name="q"
            type="search"
            placeholder="Nombre o descripción"
          />
        </label>
        <label>
          Categoría
          <select defaultValue={filter('categoryId')} name="categoryId">
            <option value="">Todas</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Estado
          <select defaultValue={filter('status')} name="status">
            <option value="">Todos</option>
            <option value="ACTIVE">Activo</option>
            <option value="INACTIVE">Inactivo</option>
          </select>
        </label>
        <label>
          Personalización
          <select defaultValue={filter('allowsCustomization')} name="allowsCustomization">
            <option value="">Todas</option>
            <option value="true">Permite</option>
            <option value="false">No permite</option>
          </select>
        </label>
        <button className="button-link" type="submit">
          Filtrar
        </button>
      </form>
      <CategoryManager
        categories={categories}
        onChanged={() => setReloadKey((value) => value + 1)}
      />
      <ErrorMessage message={error} />
      {!products && !error ? <p className="notice">Cargando productos…</p> : null}
      {products?.data.length === 0 ? (
        <p className="notice">No hay productos con estos filtros.</p>
      ) : null}
      {products?.data.length ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Categoría</th>
                <th>Estado</th>
                <th>Personalización</th>
                <th>Variantes</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {products.data.map((product) => (
                <tr key={product.id}>
                  <td className="admin-product-cell">
                    {product.primaryImage?.url ? (
                      <img alt="" src={product.primaryImage.url} />
                    ) : null}
                    <span>
                      {product.name}
                      <small>{product.slug}</small>
                    </span>
                  </td>
                  <td>{product.category?.name ?? '—'}</td>
                  <td>
                    <StatusBadge status={product.status} />
                  </td>
                  <td>{product.allowsCustomization ? 'Sí' : 'No'}</td>
                  <td>{product.variantCount ?? 0}</td>
                  <td>
                    <Link className="text-link" href={`/panel/catalogo/productos/${product.id}`}>
                      Editar
                    </Link>
                    {product.status === 'ACTIVE' ? (
                      <Link className="text-link" href={`/catalogo/${product.slug}`}>
                        Ver público
                      </Link>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {products && products.pagination.totalPages > 1 ? (
        <nav className="admin-pagination" aria-label="Paginación de productos">
          {Array.from({ length: products.pagination.totalPages }, (_, index) => index + 1).map(
            (page) => (
              <button
                aria-current={page === products.pagination.page ? 'page' : undefined}
                className={page === products.pagination.page ? 'current' : ''}
                key={page}
                onClick={() =>
                  router.push(
                    `/panel/catalogo?${adminCatalogQuery({ q: filter('q'), categoryId: filter('categoryId'), status: filter('status'), allowsCustomization: filter('allowsCustomization'), page: String(page) })}`
                  )
                }
                type="button"
              >
                {page}
              </button>
            )
          )}
        </nav>
      ) : null}
    </div>
  );
}

function CategoryManager({
  categories,
  onChanged
}: {
  categories: Category[];
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const isActive = form.get('isActive') === 'true';
    if (
      editing?.isActive &&
      !isActive &&
      !window.confirm('¿Desactivar esta categoría? Sus productos no se modificarán.')
    )
      return;
    setSaving(true);
    setError(null);
    const body = {
      name: String(form.get('name') ?? ''),
      slug: String(form.get('slug') ?? '') || undefined,
      description: String(form.get('description') ?? '') || undefined,
      isActive
    };
    try {
      await api(
        editing ? `/api/admin/catalog/categories/${editing.id}` : '/api/admin/catalog/categories',
        { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(body) }
      );
      setEditing(null);
      onChanged();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No fue posible guardar la categoría.');
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="admin-section">
      <div className="admin-section-title">
        <div>
          <h2 className="font-serif text-2xl">Categorías</h2>
          <p>Incluye categorías activas e inactivas.</p>
        </div>
        <button
          className="button-link button-link-secondary"
          onClick={() => {
            setOpen(!open);
            setEditing(null);
          }}
          type="button"
        >
          {open ? 'Cerrar' : 'Gestionar categorías'}
        </button>
      </div>
      {open ? (
        <div className="admin-category-grid">
          <form key={editing?.id ?? 'new'} className="admin-form" onSubmit={submit}>
            <h3>{editing ? 'Editar categoría' : 'Nueva categoría'}</h3>
            <label>
              Nombre
              <input defaultValue={editing?.name} name="name" required />
            </label>
            <label>
              Slug (opcional)
              <input defaultValue={editing?.slug} name="slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" />
            </label>
            <label>
              Descripción
              <textarea defaultValue={editing?.description ?? ''} name="description" />
            </label>
            <label>
              Estado
              <select defaultValue={editing?.isActive === false ? 'false' : 'true'} name="isActive">
                <option value="true">Activa</option>
                <option value="false">Inactiva</option>
              </select>
            </label>
            <ErrorMessage message={error} />
            <button className="button-link" disabled={saving} type="submit">
              {saving ? 'Guardando…' : 'Guardar categoría'}
            </button>
          </form>
          <div className="admin-category-list">
            {categories.map((category) => (
              <article key={category.id}>
                <div>
                  <strong>{category.name}</strong>
                  <small>
                    /{category.slug} · {category.productCount ?? 0} productos
                  </small>
                </div>
                <StatusBadge status={category.isActive ? 'ACTIVE' : 'INACTIVE'} />
                <button
                  className="text-link"
                  onClick={() => {
                    setEditing(category);
                    setError(null);
                  }}
                  type="button"
                >
                  Editar
                </button>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function ProductCreateForm({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError(null);
    try {
      const product = await api<Product>('/api/admin/catalog/products', {
        method: 'POST',
        body: JSON.stringify({
          categoryId: form.get('categoryId'),
          name: form.get('name'),
          slug: form.get('slug') || undefined,
          description: form.get('description'),
          allowsCustomization: form.get('allowsCustomization') === 'on',
          status: form.get('status')
        })
      });
      router.push(`/panel/catalogo/productos/${product.id}?created=1`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No fue posible crear el producto.');
    } finally {
      setSaving(false);
    }
  }
  return (
    <form className="admin-form admin-form-wide" onSubmit={submit}>
      <p className="notice">
        El producto inicia inactivo. Actívalo después de agregar una variante.
      </p>
      <label>
        Categoría
        <select name="categoryId" required>
          <option value="">Selecciona una categoría</option>
          {categories
            .filter((category) => category.isActive)
            .map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
        </select>
      </label>
      <label>
        Nombre
        <input name="name" required />
      </label>
      <label>
        Slug (opcional)
        <input name="slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" />
      </label>
      <label>
        Descripción
        <textarea name="description" required />
      </label>
      <label className="check-label">
        <input name="allowsCustomization" type="checkbox" /> Permite personalización
      </label>
      <label>
        Estado
        <select defaultValue="INACTIVE" name="status">
          <option value="INACTIVE">Inactivo</option>
          <option value="ACTIVE">Activo</option>
        </select>
      </label>
      <ErrorMessage message={error} />
      <button className="button-link" disabled={saving} type="submit">
        {saving ? 'Creando…' : 'Crear producto'}
      </button>
    </form>
  );
}

export function NewProductPage() {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<Page<Category>>('/api/admin/catalog/categories?limit=50')
      .then((result) => setCategories(result.data))
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : 'No fue posible cargar las categorías.')
      );
  }, []);
  if (error) return <ErrorMessage message={error} />;
  if (!categories) return <p className="notice">Cargando categorías…</p>;
  return <ProductCreateForm categories={categories} />;
}

export function ProductEditor({ id, created }: { id: string; created: boolean }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState(
    created ? 'Producto creado. Agrega una variante antes de activarlo.' : ''
  );
  const reload = () => {
    setError(null);
    setProduct(null);
    Promise.all([
      api<Product>(`/api/admin/catalog/products/${id}`),
      api<Page<Category>>('/api/admin/catalog/categories?limit=50')
    ])
      .then(([item, categoryResult]) => {
        setProduct(item);
        setCategories(categoryResult.data);
      })
      .catch((reason) =>
        setError(reason instanceof Error ? reason.message : 'No fue posible cargar el producto.')
      );
  };
  useEffect(reload, [id]);
  if (error) return <ListError message={error} retry={reload} />;
  if (!product) return <p className="notice">Cargando producto…</p>;
  return (
    <div className="admin-stack">
      <section className="admin-heading">
        <div>
          <Link className="text-link" href="/panel/catalogo">
            ← Catálogo
          </Link>
          <h1 className="font-serif text-4xl">{product.name}</h1>
          <p>Edición de producto y variantes.</p>
        </div>
        {product.status === 'ACTIVE' ? (
          <Link className="button-link button-link-secondary" href={`/catalogo/${product.slug}`}>
            Ver catálogo público
          </Link>
        ) : null}
      </section>
      {notice ? (
        <p className="admin-success" role="status">
          {notice}
        </p>
      ) : null}
      <ProductEditForm
        categories={categories}
        onSaved={(message) => {
          setNotice(message);
          reload();
        }}
        product={product}
      />
      <section className="admin-section">
        <h2 className="font-serif text-2xl">Variantes</h2>
        <p>Disponibilidad: existencias menos reservas.</p>
        <VariantList
          onSaved={(message) => {
            setNotice(message);
            reload();
          }}
          product={product}
        />
      </section>
      <section className="admin-section">
        <h2 className="font-serif text-2xl">Imágenes</h2>
        <p className="notice">
          Las imágenes existentes se muestran como referencia. Su administración se habilitará en
          una fase posterior.
        </p>
        <div className="admin-image-list">
          {[
            ...(product.images ?? []),
            ...(product.variants ?? []).flatMap((variant) => variant.images ?? [])
          ].map((image) => (
            <img alt={image.altText ?? ''} key={image.id} src={image.url} />
          ))}
        </div>
      </section>
    </div>
  );
}

function ProductEditForm({
  product,
  categories,
  onSaved
}: {
  product: Product;
  categories: Category[];
  onSaved: (message: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const status = form.get('status') as Status;
    if (
      status === 'ACTIVE' &&
      !(product.variants ?? []).some((variant) => variant.status === 'ACTIVE') &&
      !window.confirm(
        'Este producto no tiene variantes activas. El backend decidirá si puede activarse. ¿Deseas continuar?'
      )
    )
      return;
    if (
      product.status === 'ACTIVE' &&
      status === 'INACTIVE' &&
      !window.confirm('¿Desactivar este producto? Dejará de aparecer en el catálogo público.')
    )
      return;
    setSaving(true);
    setError(null);
    try {
      await api(`/api/admin/catalog/products/${product.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          categoryId: form.get('categoryId'),
          name: form.get('name'),
          slug: form.get('slug') || undefined,
          description: form.get('description'),
          allowsCustomization: form.get('allowsCustomization') === 'on',
          status
        })
      });
      onSaved('Cambios del producto guardados.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No fue posible guardar el producto.');
    } finally {
      setSaving(false);
    }
  }
  return (
    <form className="admin-form admin-form-wide" onSubmit={submit}>
      <h2 className="font-serif text-2xl">Datos generales</h2>
      <label>
        Categoría
        <select defaultValue={product.categoryId} name="categoryId">
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Nombre
        <input defaultValue={product.name} name="name" required />
      </label>
      <label>
        Slug
        <input defaultValue={product.slug} name="slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" />
      </label>
      <label>
        Descripción
        <textarea defaultValue={product.description} name="description" required />
      </label>
      <label className="check-label">
        <input
          defaultChecked={product.allowsCustomization}
          name="allowsCustomization"
          type="checkbox"
        />{' '}
        Permite personalización
      </label>
      <label>
        Estado
        <select defaultValue={product.status} name="status">
          <option value="ACTIVE">Activo</option>
          <option value="INACTIVE">Inactivo</option>
        </select>
      </label>
      <ErrorMessage message={error} />
      <button className="button-link" disabled={saving} type="submit">
        {saving ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </form>
  );
}

function VariantList({
  product,
  onSaved
}: {
  product: Product;
  onSaved: (message: string) => void;
}) {
  const [editing, setEditing] = useState<Variant | null>(null);
  const [adding, setAdding] = useState(false);
  return (
    <div className="admin-stack">
      {(product.variants ?? []).map((variant) => (
        <article className="admin-variant" key={variant.id}>
          <div>
            <strong>{variant.sku}</strong>
            <p>
              {variant.name ?? 'Sin nombre'} · {money(variant.salePrice)} · Disponible:{' '}
              {variant.quantityOnHand - variant.quantityReserved}
            </p>
            <StatusBadge status={variant.status} />
          </div>
          <button
            className="text-link"
            onClick={() => {
              setEditing(variant);
              setAdding(false);
            }}
            type="button"
          >
            Editar
          </button>
        </article>
      ))}
      {!product.variants?.length ? <p className="notice">Aún no hay variantes.</p> : null}
      <button
        className="button-link button-link-secondary"
        onClick={() => {
          setAdding(true);
          setEditing(null);
        }}
        type="button"
      >
        Nueva variante
      </button>
      {adding || editing ? (
        <VariantForm
          onCancel={() => {
            setAdding(false);
            setEditing(null);
          }}
          onSaved={onSaved}
          productId={product.id}
          variant={editing}
        />
      ) : null}
    </div>
  );
}

function VariantForm({
  productId,
  variant,
  onCancel,
  onSaved
}: {
  productId: string;
  variant: Variant | null;
  onCancel: () => void;
  onSaved: (message: string) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const salePrice = formNumber(form.get('salePrice'));
    const quantityOnHand = formNumber(form.get('quantityOnHand'));
    const quantityReserved = formNumber(form.get('quantityReserved'));
    const estimatedCost = formNumber(form.get('estimatedCost'));
    if (
      salePrice === null ||
      salePrice <= 0 ||
      quantityOnHand === null ||
      quantityOnHand < 0 ||
      quantityReserved === null ||
      quantityReserved < 0 ||
      quantityReserved > quantityOnHand ||
      (form.get('estimatedCost') !== '' && (estimatedCost === null || estimatedCost < 0))
    ) {
      setError('Revisa precio e inventario. Las reservas no pueden superar las existencias.');
      return;
    }
    const body = {
      sku: form.get('sku'),
      name: form.get('name') || undefined,
      dimensions: form.get('dimensions') || undefined,
      material: form.get('material') || undefined,
      color: form.get('color') || undefined,
      fabric: form.get('fabric') || undefined,
      finish: form.get('finish') || undefined,
      salePrice,
      estimatedCost,
      quantityOnHand,
      quantityReserved,
      location: form.get('location') || undefined,
      status: form.get('status') as Status
    };
    if (
      variant?.status === 'ACTIVE' &&
      body.status === 'INACTIVE' &&
      !window.confirm('¿Desactivar esta variante?')
    )
      return;
    setSaving(true);
    setError(null);
    try {
      await api(
        variant
          ? `/api/admin/catalog/variants/${variant.id}`
          : `/api/admin/catalog/products/${productId}/variants`,
        { method: variant ? 'PATCH' : 'POST', body: JSON.stringify(body) }
      );
      onCancel();
      onSaved(variant ? 'Variante actualizada.' : 'Variante creada.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No fue posible guardar la variante.');
    } finally {
      setSaving(false);
    }
  }
  const value = (field: keyof Variant) => variant?.[field] ?? '';
  return (
    <form className="admin-form admin-form-wide" onSubmit={submit}>
      <h3>{variant ? 'Editar variante' : 'Nueva variante'}</h3>
      <label>
        SKU
        <input defaultValue={String(value('sku'))} name="sku" required />
      </label>
      <label>
        Nombre
        <input defaultValue={String(value('name'))} name="name" />
      </label>
      <label>
        Dimensiones
        <input defaultValue={String(value('dimensions'))} name="dimensions" />
      </label>
      <label>
        Material
        <input defaultValue={String(value('material'))} name="material" />
      </label>
      <label>
        Color
        <input defaultValue={String(value('color'))} name="color" />
      </label>
      <label>
        Tela
        <input defaultValue={String(value('fabric'))} name="fabric" />
      </label>
      <label>
        Acabado
        <input defaultValue={String(value('finish'))} name="finish" />
      </label>
      <label>
        Precio de venta
        <input
          defaultValue={String(value('salePrice'))}
          min="0.01"
          name="salePrice"
          step="0.01"
          type="number"
          required
        />
      </label>
      <label>
        Costo estimado (opcional)
        <input
          defaultValue={variant?.estimatedCost ?? ''}
          min="0"
          name="estimatedCost"
          step="0.01"
          type="number"
        />
      </label>
      <label>
        Existencias
        <input
          defaultValue={String(value('quantityOnHand'))}
          min="0"
          name="quantityOnHand"
          step="1"
          type="number"
          required
        />
      </label>
      <label>
        Reservadas
        <input
          defaultValue={String(value('quantityReserved'))}
          min="0"
          name="quantityReserved"
          step="1"
          type="number"
          required
        />
      </label>
      <label>
        Ubicación
        <input defaultValue={String(value('location'))} name="location" />
      </label>
      <label>
        Estado
        <select defaultValue={String(value('status') || 'ACTIVE')} name="status">
          <option value="ACTIVE">Activa</option>
          <option value="INACTIVE">Inactiva</option>
        </select>
      </label>
      <ErrorMessage message={error} />
      <div className="admin-actions">
        <button className="button-link" disabled={saving} type="submit">
          {saving ? 'Guardando…' : 'Guardar variante'}
        </button>
        <button className="button-link button-link-secondary" onClick={onCancel} type="button">
          Cancelar
        </button>
      </div>
    </form>
  );
}
