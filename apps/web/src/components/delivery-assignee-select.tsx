'use client';

import { clientFetch } from '@/lib/client-fetch';
import { useEffect, useState } from 'react';
import type { DeliveryAssigneePage, DeliveryType, DeliveryUser } from '@/lib/deliveries';

type InternalDeliveryType = Exclude<DeliveryType, 'EXTERNAL_DRIVER'>;

async function loadAssignees(
  deliveryType: InternalDeliveryType,
  query: string,
  page: number,
  signal: AbortSignal
) {
  const params = new URLSearchParams({ deliveryType, page: String(page), limit: '8' });
  if (query.trim()) params.set('q', query.trim());
  const response = await clientFetch(`/api/admin/delivery-assignees?${params}`, { signal });
  const body = (await response.json().catch(() => null)) as { message?: string } | null;
  if (!response.ok)
    throw new Error(body?.message ?? 'No fue posible buscar responsables de entrega.');
  return body as DeliveryAssigneePage;
}

export function DeliveryAssigneeSelect({
  deliveryType,
  value,
  onChange
}: {
  deliveryType: InternalDeliveryType;
  value: DeliveryUser | null;
  onChange: (user: DeliveryUser | null) => void;
}) {
  const [query, setQuery] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [page, setPage] = useState<DeliveryAssigneePage | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setError(null);
    loadAssignees(deliveryType, query, pageNumber, controller.signal)
      .then(setPage)
      .catch((reason) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return;
        setPage(null);
        setError(
          reason instanceof Error
            ? reason.message
            : 'No fue posible buscar responsables de entrega.'
        );
      });
    return () => controller.abort();
  }, [deliveryType, pageNumber, query]);

  return (
    <fieldset className="delivery-assignee-fieldset">
      <legend className="font-semibold">Responsable interno</legend>
      {value ? (
        <div className="admin-actions delivery-selection">
          <span>
            {value.name ?? value.fullName ?? value.email}
            {value.email ? ` · ${value.email}` : ''}
          </span>
          <button
            className="button-link button-link-secondary"
            onClick={() => onChange(null)}
            type="button"
          >
            Cambiar
          </button>
        </div>
      ) : (
        <p className="delivery-help">Selecciona una persona activa de la lista.</p>
      )}
      <label>
        Buscar por nombre o correo
        <input
          onChange={(event) => {
            setQuery(event.target.value);
            setPageNumber(1);
          }}
          placeholder={deliveryType === 'OWNER' ? 'Buscar propietario' : 'Buscar empleado'}
          type="search"
          value={query}
        />
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {!error && !page && <p className="notice">Buscando responsables…</p>}
      {page && (
        <>
          <div className="delivery-assignee-results">
            {page.data.map((user) => (
              <button
                aria-pressed={value?.id === user.id}
                className={value?.id === user.id ? 'selected' : undefined}
                key={user.id}
                onClick={() => onChange(user)}
                type="button"
              >
                <strong>{user.name ?? user.fullName ?? user.email}</strong>
                {user.email && <span>{user.email}</span>}
              </button>
            ))}
            {!page.data.length && (
              <p className="notice">No hay responsables elegibles para esta búsqueda.</p>
            )}
          </div>
          {page.pagination.totalPages > 1 && (
            <div className="admin-actions">
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
