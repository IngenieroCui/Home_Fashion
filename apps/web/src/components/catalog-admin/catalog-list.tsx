'use client';
import { PageHeader } from '../ui/page-header';
import { LoadingState } from '../ui/loading-state';
import { EmptyState } from '../ui/empty-state';
import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ProductImage } from '../product-image';
import { adminCatalogQuery } from '@/lib/admin-catalog-utils';
import {
  api,
  ErrorMessage,
  StatusBadge,
  type Category,
  type Product,
  type Page
} from './catalog-shared';
import { CategoryManager } from './category-management';

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
      <PageHeader
        title="Catálogo"
        eyebrow="Administración"
        description="Gestiona productos, variantes, estado e inventario terminado."
        action={
          <Link className="button-link" href="/panel/catalogo/nuevo">
            Nuevo producto
          </Link>
        }
      />
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
      {!products && !error ? <LoadingState label="Cargando productos" /> : null}
      {products?.data.length === 0 ? (
        <EmptyState title="No encontramos productos">
          <p>Cambia los filtros o registra un producto con Nuevo producto.</p>
        </EmptyState>
      ) : null}
      {products?.data.length ? (
        <div className="admin-table-wrap responsive-item-table">
          <p className="admin-result-count">
            {products.pagination.total} producto{products.pagination.total === 1 ? '' : 's'} en esta
            búsqueda
          </p>
          <table className="admin-table catalog-table">
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
                  <td className="admin-product-cell" data-label="Producto">
                    <ProductImage
                      alt={product.name}
                      className="admin-product-thumb"
                      image={
                        product.primaryImage ? { ...product.primaryImage, position: 0 } : undefined
                      }
                    />
                    <span>
                      {product.name}
                      <small>{product.slug}</small>
                    </span>
                  </td>
                  <td data-label="Categoría">{product.category?.name ?? '—'}</td>
                  <td data-label="Estado">
                    <StatusBadge status={product.status} />
                  </td>
                  <td data-label="Personalización">{product.allowsCustomization ? 'Sí' : 'No'}</td>
                  <td data-label="Variantes">{product.variantCount ?? 0}</td>
                  <td data-label="Acción">
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
