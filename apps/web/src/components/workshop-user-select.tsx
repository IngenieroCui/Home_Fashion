'use client';

import { clientFetch } from '@/lib/client-fetch';
import { useEffect, useState } from 'react';
import type { WorkshopUser, WorkshopUserPage } from '@/lib/workshop-jobs';

async function loadUsers(query: string, page: number) {
  const params = new URLSearchParams({ page: String(page), limit: '8' });
  if (query.trim()) params.set('q', query.trim());
  const response = await clientFetch(`/api/admin/workshop-users?${params}`);
  const body = (await response.json().catch(() => null)) as { message?: string } | null;
  if (!response.ok) throw new Error(body?.message ?? 'No fue posible buscar talleres.');
  return body as WorkshopUserPage;
}

export function WorkshopUserSelect({
  value,
  onChange
}: {
  value: WorkshopUser | null;
  onChange: (user: WorkshopUser | null) => void;
}) {
  const [query, setQuery] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [page, setPage] = useState<WorkshopUserPage | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    loadUsers(query, pageNumber)
      .then(setPage)
      .catch((reason) => {
        setPage(null);
        setError(reason instanceof Error ? reason.message : 'No fue posible buscar talleres.');
      });
  }, [query, pageNumber]);

  return (
    <fieldset className="admin-section">
      <legend className="font-semibold">Taller asignado</legend>
      {value ? (
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <span>
            {value.name || value.email} · {value.email}
          </span>
          <button
            className="button-link button-link-secondary"
            onClick={() => onChange(null)}
            type="button"
          >
            Limpiar selección
          </button>
        </div>
      ) : (
        <p className="mt-2 text-sm">Selecciona un usuario elegible enviado por el backend.</p>
      )}
      <label className="mt-3 block">
        Buscar taller
        <input
          onChange={(event) => {
            setQuery(event.target.value);
            setPageNumber(1);
          }}
          placeholder="Nombre o correo"
          type="search"
          value={query}
        />
      </label>
      {error && (
        <p className="form-error mt-2" role="alert">
          {error}
        </p>
      )}
      {!error && !page && <p className="notice mt-2">Buscando talleres…</p>}
      {page && (
        <>
          <div className="mt-3 grid gap-2">
            {page.data.map((user) => (
              <button
                className={`rounded border p-3 text-left ${value?.id === user.id ? 'border-[var(--color-primary)] bg-[#f5e8df]' : 'border-[var(--color-border)] bg-white'}`}
                key={user.id}
                onClick={() => onChange(user)}
                type="button"
              >
                <strong>{user.name || user.email}</strong>
                <br />
                <span className="text-sm">{user.email}</span>
              </button>
            ))}
            {!page.data.length && (
              <p className="notice">No hay talleres elegibles para esta búsqueda.</p>
            )}
          </div>
          {page.pagination.totalPages > 1 && (
            <div className="admin-actions mt-3">
              <button
                className="button-link button-link-secondary"
                disabled={pageNumber <= 1}
                onClick={() => setPageNumber((current) => current - 1)}
                type="button"
              >
                Anterior
              </button>
              <span>
                Página {page.pagination.page} de {page.pagination.totalPages}
              </span>
              <button
                className="button-link button-link-secondary"
                disabled={pageNumber >= page.pagination.totalPages}
                onClick={() => setPageNumber((current) => current + 1)}
                type="button"
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}
    </fieldset>
  );
}
