'use client';

import { clientFetch } from '@/lib/client-fetch';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  formatCustomization,
  formatDate,
  formatDateTime,
  workshopJobStatusLabel,
  type WorkshopJob
} from '@/lib/workshop-jobs';
import { WorkshopJobStatusBadge } from './workshop-job-status-badge';
import { WorkshopProgressHistory } from './workshop-progress-history';

async function loadJob(id: string) {
  const response = await clientFetch(`/api/admin/workshop-jobs/${encodeURIComponent(id)}`);
  const body = (await response.json().catch(() => null)) as { message?: string } | null;
  if (!response.ok) throw new Error(body?.message ?? 'No fue posible cargar el trabajo.');
  return body as WorkshopJob;
}

export function WorkshopJobDetail({ id, canReview }: { id: string; canReview: boolean }) {
  const [job, setJob] = useState<WorkshopJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    setError(null);
    try {
      setJob(await loadJob(id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No fue posible cargar el trabajo.');
    }
  }, [id]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  if (error)
    return (
      <p className="form-error" role="alert">
        {error}
      </p>
    );
  if (!job) return <p className="notice">Cargando trabajo…</p>;
  const customization = formatCustomization(job.orderItem.customization);
  return (
    <div className="admin-stack">
      <section className="admin-heading">
        <div>
          <Link className="text-link" href="/panel/talleres/trabajos">
            ← Trabajos asignados
          </Link>
          <p className="eyebrow">{job.code}</p>
          <h1 className="font-serif text-4xl">Detalle del trabajo</h1>
        </div>
        <WorkshopJobStatusBadge status={job.status} />
      </section>
      <section className="admin-section">
        <h2 className="font-serif text-2xl">Asignación</h2>
        <p>Estado: {workshopJobStatusLabel[job.status]}</p>
        <p>
          Taller: {job.workshopUser.fullName} · {job.workshopUser.email}
        </p>
        <p>
          Asignó: {job.assignedByUser.fullName} · {job.assignedByUser.email}
        </p>
        <p>Fecha de asignación: {formatDateTime(job.assignedAt)}</p>
        <p>Fecha esperada: {formatDate(job.expectedCompletionDate)}</p>
        <p>Instrucciones: {job.instructions ?? '—'}</p>
      </section>
      <section className="admin-section">
        <h2 className="font-serif text-2xl">Pedido</h2>
        <p>
          <Link className="text-link" href={`/panel/pedidos/${job.order.id}`}>
            {job.order.code}
          </Link>
        </p>
        <p>Estado: {job.order.status}</p>
        <p>Fecha prometida: {formatDate(job.order.promisedDate)}</p>
        <p>Notas: {job.order.notes ?? '—'}</p>
        <p>
          Cliente: {job.customer?.fullName ?? '—'}
          {job.customer?.phone ? ` · ${job.customer.phone}` : ''}
        </p>
      </section>
      <section className="admin-section">
        <h2 className="font-serif text-2xl">Elemento del pedido</h2>
        <p>Producto: {job.orderItem.productNameSnapshot}</p>
        <p>Variante: {job.orderItem.variantNameSnapshot ?? '—'}</p>
        <p>SKU: {job.orderItem.skuSnapshot ?? '—'}</p>
        <p>Cantidad: {job.orderItem.quantity}</p>
        <p>Suministro: {job.orderItem.supplyType}</p>
        <p>Estado actual: {job.orderItem.status}</p>
        <p>Notas: {job.orderItem.notes ?? '—'}</p>
        {customization.length > 0 && (
          <div>
            <p>Personalización:</p>
            {customization.map((entry) => (
              <p key={entry.label}>
                {entry.label}: {entry.value}
              </p>
            ))}
          </div>
        )}
      </section>
      <WorkshopProgressHistory canReview={canReview} reports={job.progressReports ?? []} />
    </div>
  );
}
