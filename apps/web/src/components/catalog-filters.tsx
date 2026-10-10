'use client';
import { Dialog } from './ui/dialog';
/* eslint-disable @next/next/no-html-link-for-pages -- GET filters deliberately reload the server-rendered catalog results. */
import { useRef } from 'react';
import {
  catalogQuery,
  formatPrice,
  type CatalogFilters as Filters,
  type Category
} from '@/lib/catalog';

const sorts = [
  ['name', 'Nombre'],
  ['newest', 'Recientes'],
  ['price-asc', 'Precio menor'],
  ['price-desc', 'Precio mayor']
];
function FilterForm({
  categories,
  filters,
  prefix
}: {
  categories: Category[];
  filters: Filters;
  prefix: string;
}) {
  return (
    <form key={JSON.stringify(filters)} action="/catalogo" className="filter-panel">
      <div>
        <label htmlFor={`${prefix}-q`}>Buscar</label>
        <input
          defaultValue={filters.q}
          id={`${prefix}-q`}
          name="q"
          placeholder="Ej. Verona"
          type="search"
        />
      </div>
      <div>
        <label htmlFor={`${prefix}-category`}>Categoría</label>
        <select defaultValue={filters.category ?? ''} id={`${prefix}-category`} name="category">
          <option value="">Todas las categorías</option>
          {categories.map((category) => (
            <option key={category.id} value={category.slug}>
              {category.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={`${prefix}-sort`}>Ordenar por</label>
        <select defaultValue={filters.sort ?? 'name'} id={`${prefix}-sort`} name="sort">
          {sorts.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="filter-price-range">
        <label htmlFor={`${prefix}-minPrice`}>Precio desde</label>
        <input
          inputMode="decimal"
          defaultValue={filters.minPrice}
          id={`${prefix}-minPrice`}
          min="0"
          name="minPrice"
          step="1000"
          type="number"
        />
      </div>
      <div className="filter-price-range">
        <label htmlFor={`${prefix}-maxPrice`}>Precio hasta</label>
        <input
          inputMode="decimal"
          defaultValue={filters.maxPrice}
          id={`${prefix}-maxPrice`}
          min="0"
          name="maxPrice"
          step="1000"
          type="number"
        />
      </div>
      <label className="check-label">
        <input defaultChecked={filters.inStock} name="inStock" type="checkbox" value="true" />
        Disponibles
      </label>
      <label className="check-label">
        <input
          defaultChecked={filters.allowsCustomization}
          name="allowsCustomization"
          type="checkbox"
          value="true"
        />
        Personalizables
      </label>
      <div className="admin-actions">
        <button className="button-link" type="submit">
          Aplicar
        </button>
        <a className="text-link" href="/catalogo">
          Limpiar filtros
        </a>
      </div>
    </form>
  );
}
export function CatalogFilters({
  categories,
  filters
}: {
  categories: Category[];
  filters: Filters;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const chips: { label: string; keys: (keyof Filters)[] }[] = [];
  if (filters.q) chips.push({ label: `“${filters.q}”`, keys: ['q'] });
  if (filters.category)
    chips.push({
      label:
        categories.find((category) => category.slug === filters.category)?.name ?? filters.category,
      keys: ['category']
    });
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined)
    chips.push({
      label: `${filters.minPrice !== undefined ? formatPrice(String(filters.minPrice)) : '$0'} – ${filters.maxPrice !== undefined ? formatPrice(String(filters.maxPrice)) : 'sin máximo'}`,
      keys: ['minPrice', 'maxPrice']
    });
  if (filters.allowsCustomization)
    chips.push({ label: 'Personalizables', keys: ['allowsCustomization'] });
  if (filters.inStock) chips.push({ label: 'Disponibles', keys: ['inStock'] });
  function removed(keys: (keyof Filters)[]) {
    const next = { ...filters, page: 1 };
    keys.forEach((key) => delete next[key]);
    return `/catalogo${catalogQuery(next)}`;
  }
  return (
    <>
      <div className="catalog-desktop-filters">
        <FilterForm categories={categories} filters={filters} prefix="desktop" />
      </div>
      <div className="catalog-mobile-toolbar">
        <button
          ref={toggle}
          className="button-link button-link-secondary"
          type="button"
          onClick={() => dialog.current?.showModal()}
        >
          Filtros ({chips.length})
        </button>
        <form action="/catalogo" key={JSON.stringify(filters)}>
          <label htmlFor="mobile-sort">Ordenar</label>
          <select
            id="mobile-sort"
            name="sort"
            defaultValue={filters.sort ?? 'name'}
            onChange={(event) => event.currentTarget.form?.requestSubmit()}
          >
            {sorts.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {Array.from(new URLSearchParams(catalogQuery(filters).slice(1)))
            .filter(([key]) => key !== 'sort' && key !== 'page')
            .map(([key, value]) => (
              <input type="hidden" key={key} name={key} value={value} />
            ))}
        </form>
      </div>
      <Dialog
        ref={dialog}
        className="filter-dialog"
        aria-labelledby="filters-title"
        onClose={() => toggle.current?.focus()}
      >
        <div className="section-heading">
          <h2 id="filters-title" className="font-serif text-2xl">
            Filtra tu colección
          </h2>
          <button
            type="button"
            className="dialog-close"
            aria-label="Cerrar filtros"
            onClick={() => dialog.current?.close()}
          >
            ✕
          </button>
        </div>
        <FilterForm categories={categories} filters={filters} prefix="dialog" />
      </Dialog>
      {chips.length > 0 && (
        <nav className="active-filter-chips" aria-label="Filtros activos">
          {chips.map(({ label, keys }) => (
            <a href={removed(keys)} key={keys.join(',')} aria-label={`Quitar filtro ${label}`}>
              {label} <span aria-hidden="true">×</span>
            </a>
          ))}
          <a className="text-link" href="/catalogo">
            Limpiar filtros
          </a>
        </nav>
      )}
    </>
  );
}
