// Pagination reloads the server-rendered catalog, like its GET filters.
import { catalogQuery, type CatalogFilters, type PaginatedProducts } from '@/lib/catalog';

export function Pagination({
  filters,
  pagination
}: {
  filters: CatalogFilters;
  pagination: PaginatedProducts['pagination'];
}) {
  if (pagination.totalPages < 2) return null;
  const href = (page: number) => `/catalogo${catalogQuery({ ...filters, page })}`;
  return (
    <nav
      aria-label="Paginación"
      className="mt-10 flex flex-wrap items-center justify-between gap-4"
    >
      <span className="text-sm text-[var(--color-text-muted)]">
        Página {pagination.page} de {pagination.totalPages}
      </span>
      <div className="flex gap-3">
        {pagination.page > 1 && (
          <a className="button-link button-link-secondary" href={href(pagination.page - 1)}>
            Anterior
          </a>
        )}
        {pagination.page < pagination.totalPages && (
          <a className="button-link" href={href(pagination.page + 1)}>
            Siguiente
          </a>
        )}
      </div>
    </nav>
  );
}
