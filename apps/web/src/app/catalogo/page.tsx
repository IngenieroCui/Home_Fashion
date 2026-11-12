import Link from 'next/link';
import { CatalogFilters } from '@/components/catalog-filters';
import { Pagination } from '@/components/pagination';
import { ProductGrid } from '@/components/product-grid';
import { PageState } from '@/components/page-state';
import { RetryButton } from '@/components/retry-button';
import {
  getCategories,
  getProducts,
  CatalogApiError,
  type CatalogFilters as CatalogFiltersType
} from '@/lib/catalog';

export const dynamic = 'force-dynamic';
type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const value = (input: string | string[] | undefined) =>
  typeof input === 'string' ? input : undefined;

function filtersFrom(params: Record<string, string | string[] | undefined>): CatalogFiltersType {
  const page = Number(value(params.page));
  const price = (field: 'minPrice' | 'maxPrice') => {
    const raw = value(params[field]);
    if (!raw) return undefined;
    const number = Number(raw);
    return Number.isSafeInteger(number) && number >= 0 ? number : undefined;
  };
  const sort = value(params.sort);
  return {
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
    q: value(params.q)?.trim(),
    category: value(params.category),
    allowsCustomization: value(params.allowsCustomization) === 'true',
    inStock: value(params.inStock) === 'true',
    sort: sort === 'newest' || sort === 'price-asc' || sort === 'price-desc' ? sort : 'name',
    minPrice: price('minPrice'),
    maxPrice: price('maxPrice')
  };
}

export default async function CatalogPage({ searchParams }: { searchParams: SearchParams }) {
  const filters = filtersFrom(await searchParams);
  const hasFilters = Boolean(
    filters.q ||
    filters.category ||
    filters.allowsCustomization ||
    filters.inStock ||
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined ||
    filters.sort !== 'name' ||
    (filters.page ?? 1) > 1
  );
  const [categoriesResult, productsResult] = await Promise.allSettled([
    getCategories(),
    getProducts(filters)
  ]);
  const categories = categoriesResult.status === 'fulfilled' ? categoriesResult.value : [];
  const invalidFilters =
    productsResult.status === 'rejected' &&
    productsResult.reason instanceof CatalogApiError &&
    productsResult.reason.status === 400;
  return (
    <main className="page-shell py-12">
      <p className="eyebrow">Colección Home Fashion</p>
      <h1 className="mt-2 font-serif text-5xl">Encuentra tu próximo favorito</h1>
      <p className="mt-4 max-w-2xl text-[var(--color-text-muted)]">
        Diseños para vivirlos. Explora los muebles, conoce sus detalles y cotiza las opciones que
        van contigo.
      </p>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-[#806d5b]">
        Esta colección contiene productos de demostración con imágenes y valores de referencia.
        Confirmaremos cada propuesta antes de registrar una venta.
      </p>
      <div className="mt-8">
        <CatalogFilters categories={categories} filters={filters} />
      </div>
      {categoriesResult.status === 'rejected' && productsResult.status === 'fulfilled' && (
        <p className="notice mt-4">
          No pudimos cargar las categorías. Puedes buscar por nombre o intentarlo nuevamente.
        </p>
      )}
      <div className="mt-8">
        {productsResult.status === 'rejected' ? (
          <PageState
            title={
              invalidFilters ? 'Revisa los filtros del catálogo' : 'No pudimos cargar el catálogo'
            }
            tone="error"
            action={
              invalidFilters ? (
                <Link className="button-link" href="/catalogo">
                  Limpiar filtros
                </Link>
              ) : (
                <RetryButton />
              )
            }
          >
            <p>
              {invalidFilters
                ? 'El enlace contiene un filtro que no reconocemos. Vuelve al catálogo para iniciar una nueva búsqueda.'
                : 'La conexión no está disponible en este momento. Espera un poco y vuelve a intentarlo.'}
            </p>
          </PageState>
        ) : productsResult.value.data.length ? (
          <section aria-label="Resultados del catálogo">
            <p className="mb-5 text-sm text-[var(--color-text-muted)]">
              {productsResult.value.pagination.total}{' '}
              {productsResult.value.pagination.total === 1
                ? 'mueble encontrado'
                : 'muebles encontrados'}
            </p>
            <ProductGrid products={productsResult.value.data} />
            <Pagination filters={filters} pagination={productsResult.value.pagination} />
          </section>
        ) : (
          <PageState
            title={
              hasFilters
                ? 'Todavía no encontramos esa combinación'
                : 'Nuestra colección está por llegar'
            }
            action={
              hasFilters ? (
                <Link className="button-link button-link-secondary" href="/catalogo">
                  Ver todos los muebles
                </Link>
              ) : (
                <Link className="button-link button-link-secondary" href="/">
                  Volver al inicio
                </Link>
              )
            }
          >
            <p>
              {hasFilters
                ? 'Prueba con otro nombre o elimina algunos filtros para descubrir más opciones.'
                : 'Aún no hay muebles publicados. Vuelve pronto para conocer las novedades de Home Fashion.'}
            </p>
          </PageState>
        )}
      </div>
    </main>
  );
}
