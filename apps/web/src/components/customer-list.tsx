'use client';
import { LoadingState as AdminSkeleton } from './ui/loading-state';
import { formatDate } from '@/lib/formatters';

import Link from 'next/link';
import { type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePageData } from '@/lib/use-page-data';
import { optionalText, type Page, type Customer } from '@/lib/customer-quote-utils';
import { ListError, PageState } from './page-state';
import { AdminRecordCard } from './admin-record-card';
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
      {!error && !page && <AdminSkeleton label="Cargando clientes" />}
      {page &&
        (page.data.length ? (
          <>
            <div className="admin-table-wrap admin-desktop">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Contacto</th>
                    <th>Ubicación</th>
                    <th>Estado</th>
                    <th>Actividad</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {page.data.map((customer) => (
                    <tr key={customer.id}>
                      <td>
                        <strong>{customer.fullName}</strong>
                        <small className="item-note">
                          {customer.documentType} {customer.documentNumber}
                        </small>
                      </td>
                      <td>
                        {customer.phone}
                        <small className="item-note">{customer.email || 'Sin correo'}</small>
                      </td>
                      <td>
                        {customer.city || 'Sin ciudad'}
                        <small className="item-note">{customer.neighborhood}</small>
                      </td>
                      <td>
                        <span className="admin-status">
                          {customer.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td>{customer.updatedAt ? formatDate(customer.updatedAt) : 'Sin cambios'}</td>
                      <td>
                        <Link className="text-link" href={`/panel/clientes/${customer.id}`}>
                          Ver ficha →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="admin-mobile-cards">
              {page.data.map((customer) => (
                <AdminRecordCard
                  key={customer.id}
                  title={customer.fullName}
                  subtitle={`${customer.documentType || ''} ${customer.documentNumber || ''}`}
                  badge={
                    <span className="admin-status">
                      {customer.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  }
                  actions={
                    <Link className="text-link" href={`/panel/clientes/${customer.id}`}>
                      Ver ficha →
                    </Link>
                  }
                >
                  <p>{customer.phone}</p>
                  {customer.email && <p>{customer.email}</p>}
                  <p>
                    {customer.city || 'Sin ciudad'}
                    {customer.neighborhood ? ` · ${customer.neighborhood}` : ''}
                  </p>
                  <small>
                    Último cambio:{' '}
                    {customer.updatedAt ? formatDate(customer.updatedAt) : 'Sin cambios'}
                  </small>
                </AdminRecordCard>
              ))}
            </div>
          </>
        ) : (
          <PageState
            title="No hay clientes para mostrar"
            action={
              <Link className="button-link" href="/panel/clientes/nuevo">
                Nuevo cliente
              </Link>
            }
          >
            <p>Ajusta los filtros o registra los datos de un nuevo cliente.</p>
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
    </div>
  );
}
