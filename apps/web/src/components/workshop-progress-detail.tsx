'use client';

import { orderItemStatusLabel } from '@/lib/orders';
import { CommerceItemVisual } from './commerce-item-visual';


import { clientFetch } from '@/lib/client-fetch';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  formatCustomization,
  formatDate,
  formatDateTime,
  workshopJobStatusLabel
} from '@/lib/workshop-jobs';
import { type WorkshopProgressReport } from '@/lib/workshop-progress';
import { EvidenceLinks } from './evidence-links';
import { ReviewProgressForm } from './review-progress-form';
import { ReviewStatusBadge, WorkshopProgressTypeBadge } from './workshop-progress-badges';
import { ListError } from './page-state';

async function loadReport(id: string) {
  const response = await clientFetch(`/api/admin/workshop-progress/${encodeURIComponent(id)}`);
  const body = (await response.json().catch(() => null)) as { message?: string } | null;
  if (!response.ok) throw new Error(body?.message ?? 'No fue posible cargar el reporte.');
  return body as WorkshopProgressReport;
}

export function WorkshopProgressDetail({ id }: { id: string }) {
  const [report, setReport] = useState<WorkshopProgressReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reviewNotice, setReviewNotice] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    setError(null);
    try {
      setReport(await loadReport(id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No fue posible cargar el reporte.');
    }
  }, [id]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  if (error)
    return (
      <ListError message={error} retry={() => void refresh()} />
    );
  if (!report) return <p className="notice">Cargando reporte…</p>;
  const customization = formatCustomization(report.orderItem.customization);
  return (
    <div className="admin-stack">
      <section className="admin-heading">
        <div>
          <Link className="text-link" href="/panel/talleres/avances">
            ← Revisión de avances
          </Link>
          <p className="eyebrow">{report.workshopJob.code}</p>
          <h1 className="font-serif text-4xl">Detalle del avance</h1>
        </div>
        <ReviewStatusBadge status={report.reviewStatus} />
      </section>
      {reviewNotice && (
        <p className="notice" role="status">
          {reviewNotice}
        </p>
      )}
      {report.reviewStatus === 'PENDING_REVIEW' && (
        <p className="notice">Este avance requiere una decisión.</p>
      )}
      <section className="admin-section">
        <h2 className="font-serif text-2xl">Reporte</h2>
        <p>
          <WorkshopProgressTypeBadge type={report.type} />
        </p>
        <p>Enviado: {formatDateTime(report.submittedAt)}</p>
        <p>
          Porcentaje: {report.progressPercent ?? '—'}
          {report.progressPercent === null ? '' : '%'}
        </p>
        <p>Mensaje: {report.message}</p>
        <p>
          Registrado por: {report.submittedByUser?.fullName ?? report.workshop?.fullName ?? '—'}
        </p>
      </section>
      <section className="admin-section">
        <h2 className="font-serif text-2xl">Trabajo y pedido</h2>
        <p>
          Taller: {report.workshop?.fullName ?? '—'}
          {report.workshop?.email ? ` · ${report.workshop.email}` : ''}
        </p>
        <p>
          Trabajo:{' '}
          <Link className="text-link" href={`/panel/talleres/trabajos/${report.workshopJob.id}`}>
            {report.workshopJob.code}
          </Link>
        </p>
        <p>Estado del trabajo: {workshopJobStatusLabel[report.workshopJob.status]}</p>
        <p>Instrucciones: {report.workshopJob.instructions ?? '—'}</p>
        <p>Fecha esperada: {formatDate(report.workshopJob.expectedCompletionDate)}</p>
        <p>
          Pedido:{' '}
          <Link className="text-link" href={`/panel/pedidos/${report.order.id}`}>
            {report.order.code}
          </Link>
        </p>
        <p>
          Cliente: {report.customer?.fullName ?? '—'}
          {report.customer?.phone ? ` · ${report.customer.phone}` : ''}
        </p>
      </section>
      <section className="admin-section">
        <h2 className="font-serif text-2xl">Elemento fabricado</h2>
        <CommerceItemVisual imageUrl={report.orderItem.imageUrlSnapshot} name={report.orderItem.productNameSnapshot} variant={report.orderItem.variantNameSnapshot} quantity={report.orderItem.quantity} />
        <p>Variante: {report.orderItem.variantNameSnapshot ?? '—'}</p>
        <p>SKU: {report.orderItem.skuSnapshot ?? '—'}</p>
        <p>Cantidad: {report.orderItem.quantity}</p>
        <p>Estado actual: {orderItemStatusLabel[report.orderItem.status]}</p>
        <p>Notas: {report.orderItem.notes ?? '—'}</p>
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
      <EvidenceLinks urls={report.evidenceUrls} />
      {report.reviewStatus !== 'PENDING_REVIEW' && (
        <section className="admin-section">
          <h2 className="font-serif text-2xl">Decisión registrada</h2>
          <p>
            Estado: <ReviewStatusBadge status={report.reviewStatus} />
          </p>
          <p>Revisor: {report.reviewedByUser?.fullName ?? '—'}</p>
          <p>Fecha: {formatDateTime(report.reviewedAt)}</p>
          <p>Comentario: {report.reviewComment ?? '—'}</p>
        </section>
      )}
      {report.reviewStatus === 'PENDING_REVIEW' && (
        <ReviewProgressForm onConcurrent={setReviewNotice} onReviewed={refresh} report={report} />
      )}
    </div>
  );
}
