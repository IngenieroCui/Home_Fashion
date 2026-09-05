import Link from 'next/link';
import type { CatalogFilters, Category } from '@/lib/catalog';

export function CatalogFilters({
  categories,
  filters
}: {
  categories: Category[];
  filters: CatalogFilters;
}) {
  return (
    <form key={JSON.stringify(filters)} action="/catalogo" className="filter-panel">
      <div>
        <label htmlFor="q">Buscar</label>
        <input defaultValue={filters.q} id="q" name="q" placeholder="Ej. Verona" type="search" />
      </div>
      <div>
        <label htmlFor="category">Categoría</label>
        <select defaultValue={filters.category ?? ''} id="category" name="category">
          <option value="">Todas las categorías</option>
          {categories.map((category) => (
            <option key={category.id} value={category.slug}>
              {category.name}
            </option>
          ))}
        </select>
      </div>
      <label className="check-label">
        <input defaultChecked={filters.inStock} name="inStock" type="checkbox" value="true" /> Solo
        disponibles
      </label>
      <label className="check-label">
        <input
          defaultChecked={filters.allowsCustomization}
          name="allowsCustomization"
          type="checkbox"
          value="true"
        />{' '}
        Personalizables
      </label>
      <div className="flex gap-3">
        <button className="button-link" type="submit">
          Aplicar
        </button>
        <Link className="button-link button-link-secondary" href="/catalogo">
          Limpiar
        </Link>
      </div>
    </form>
  );
}
