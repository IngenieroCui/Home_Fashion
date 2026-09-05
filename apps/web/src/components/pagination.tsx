import Link from 'next/link';
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
      <span className="text-sm text-[#67574d]">
        Página {pagination.page} de {pagination.totalPages}
      </span>
      <div className="flex gap-3">
        {pagination.page > 1 && (
          <Link className="button-link button-link-secondary" href={href(pagination.page - 1)}>
            Anterior
          </Link>
        )}
        {pagination.page < pagination.totalPages && (
          <Link className="button-link" href={href(pagination.page + 1)}>
            Siguiente
          </Link>
        )}
      </div>
    </nav>
  );
}
