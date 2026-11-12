'use client';
import { LoadingState as AdminSkeleton } from './ui/loading-state';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePageData } from '@/lib/use-page-data';
import type { Page } from '@/lib/customer-quote-utils';
import { inventoryAlertLabel, type InventoryPage, type InventoryRow } from '@/lib/inventory';
import { AdminRecordCard } from './admin-record-card';
import { CommerceItemVisual } from './commerce-item-visual';
import { DashboardMetricCard } from './dashboard-metric-card';
import { InventoryAdjustDialog } from './inventory-adjust-dialog';
import { ListError, PageState } from './page-state';
export function InventoryList() {
  const search = useSearchParams();
  const router = useRouter();
  const query = search.toString();
  const { page, error, retry } = usePageData<InventoryPage>(
    `/api/admin/operations/inventory?${query}`
  );
  const { page: categories } = usePageData<Page<{ id: string; name: string }>>(
    '/api/admin/catalog/categories?limit=50'
  );
  const [adjusting, setAdjusting] = useState<InventoryRow | null>(null);
  const [success, setSuccess] = useState('');
  function filter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    for (const key of ['q', 'categoryId', 'status', 'alert']) {
      const value = String(form.get(key) || '').trim();
      if (value) params.set(key, value);
    }
    router.push(`/panel/inventario?${params}`);
  }
  function changePage(next: number) {
    const params = new URLSearchParams(query);
    params.set('page', String(next));
    router.push(`/panel/inventario?${params}`);
  }
  const badge = (row: InventoryRow) => (
    <span
      className={`admin-status inventory-${row.variantStatus === 'ACTIVE' ? row.alert.toLowerCase() : 'inactive'}`}
    >
      {row.variantStatus === 'ACTIVE' ? inventoryAlertLabel[row.alert] : 'Inactiva'}
    </span>
  );
  const action = (row: InventoryRow) => (
    <button className="text-link" onClick={() => setAdjusting(row)}>
      Ajustar existencia
    </button>
  );
  return (
    <div className="admin-stack">
      <section className="admin-heading">
        <div>
          <p className="eyebrow">Catálogo</p>
          <h1 className="font-serif text-4xl">Inventario terminado</h1>
          <p>Consulta existencias físicas, reservas y disponibilidad real.</p>
        </div>
        <Link className="text-link" href="/panel/catalogo">
          Ver productos →
        </Link>
      </section>
      {page && (
        <div className="dashboard-metrics">
          <DashboardMetricCard
            label="Existencias físicas"
            value={page.summary.onHandUnits}
            href="/panel/inventario"
          />
          <DashboardMetricCard
            label="Reservadas"
            value={page.summary.reservedUnits}
            href="/panel/inventario?alert=RESERVED"
          />
          <DashboardMetricCard
            label="Disponibles"
            value={page.summary.availableUnits}
            href="/panel/inventario?alert=AVAILABLE"
          />
          <DashboardMetricCard
            label="Stock bajo"
            value={page.summary.lowStockVariants}
            href="/panel/inventario?alert=LOW_STOCK"
          />
          <DashboardMetricCard
            label="Sin stock"
            value={page.summary.outOfStockVariants}
            href="/panel/inventario?alert=OUT_OF_STOCK"
          />
        </div>
      )}
      <form key={query} className="admin-filters" onSubmit={filter}>
        <label>
          Buscar
          <input
            type="search"
            name="q"
            defaultValue={search.get('q') || ''}
            placeholder="Producto, SKU o variante"
          />
        </label>
        <label>
          Categoría
          <select name="categoryId" defaultValue={search.get('categoryId') || ''}>
            <option value="">Todas</option>
            {categories?.data.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Estado de variante
          <select name="status" defaultValue={search.get('status') || ''}>
            <option value="">Todos</option>
            <option value="ACTIVE">Activa</option>
            <option value="INACTIVE">Inactiva</option>
          </select>
        </label>
        <label>
          Disponibilidad
          <select name="alert" defaultValue={search.get('alert') || 'ALL'}>
            <option value="ALL">Todas</option>
            <option value="OUT_OF_STOCK">Sin stock</option>
            <option value="LOW_STOCK">Stock bajo</option>
            <option value="AVAILABLE">Disponible</option>
            <option value="RESERVED">Con reservas</option>
          </select>
        </label>
        <button className="button-link">Filtrar</button>
      </form>
      {success && (
        <p className="admin-success" role="status">
          {success}
        </p>
      )}
      {error && <ListError message={error} retry={retry} />}{' '}
      {!error && !page && <AdminSkeleton label="Cargando inventario" />}
      {page &&
        (page.data.length ? (
          <>
            <div className="admin-table-wrap admin-desktop">
              <table className="admin-table">
                <thead>
                  <tr>
                    {[
                      'Producto',
                      'SKU / Variante',
                      'Ubicación',
                      'Existencias',
                      'Reservadas',
                      'Disponibles',
                      'Estado',
                      'Acción'
                    ].map((label) => (
                      <th key={label}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {page.data.map((row) => (
                    <tr key={row.variantId}>
                      <td>
                        <CommerceItemVisual
                          imageUrl={row.imageUrl}
                          name={row.productName}
                          meta={<small>{row.category.name}</small>}
                        />
                      </td>
                      <td>
                        {row.sku}
                        <small className="item-note">{row.variantName}</small>
                      </td>
                      <td>{row.location || 'Sin ubicación'}</td>
                      <td>{row.quantityOnHand}</td>
                      <td>{row.quantityReserved}</td>
                      <td>
                        <strong>{row.quantityAvailable}</strong>
                      </td>
                      <td>{badge(row)}</td>
                      <td>{action(row)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="admin-mobile-cards">
              {page.data.map((row) => (
                <AdminRecordCard
                  key={row.variantId}
                  title={
                    <CommerceItemVisual
                      imageUrl={row.imageUrl}
                      name={row.productName}
                      variant={row.variantName}
                      meta={<small>{row.sku}</small>}
                    />
                  }
                  badge={badge(row)}
                  actions={action(row)}
                >
                  <dl className="record-values">
                    <div>
                      <dt>Existencias</dt>
                      <dd>{row.quantityOnHand}</dd>
                    </div>
                    <div>
                      <dt>Reservadas</dt>
                      <dd>{row.quantityReserved}</dd>
                    </div>
                    <div>
                      <dt>Disponibles</dt>
                      <dd>{row.quantityAvailable}</dd>
                    </div>
                  </dl>
                  <p>{row.location || 'Sin ubicación'}</p>
                </AdminRecordCard>
              ))}
            </div>
          </>
        ) : (
          <PageState
            title="No hay variantes para mostrar"
            action={
              <Link className="button-link" href="/panel/catalogo">
                Gestionar productos
              </Link>
            }
          >
            <p>Ajusta los filtros o añade variantes a tus productos.</p>
          </PageState>
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
      {adjusting && (
        <InventoryAdjustDialog
          row={adjusting}
          onClose={() => setAdjusting(null)}
          onSaved={() => {
            setSuccess('Existencias actualizadas.');
            retry();
          }}
        />
      )}
    </div>
  );
}
