'use client';

import { clientFetch } from '@/lib/client-fetch';
import { useState } from 'react';
import type { WorkshopProgressReport } from '@/lib/workshop-progress';

export function ReviewProgressForm({
  report,
  onReviewed,
  onConcurrent
}: {
  report: WorkshopProgressReport;
  onReviewed: () => Promise<void>;
  onConcurrent: (message: string) => void;
}) {
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const ready = report.type === 'READY_FOR_REVIEW';
  const explanation = ready
    ? 'Aprobar completa el trabajo y cambia el elemento a READY. Rechazar devuelve el trabajo a IN_PROGRESS y el elemento permanece en IN_PRODUCTION.'
    : 'Aprobar o rechazar este reporte no revierte automáticamente los estados operativos.';

  async function submit(decision: 'APPROVE' | 'REJECT') {
    if (decision === 'REJECT' && !comment.trim()) {
      setError('El comentario es obligatorio para rechazar.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const response = await clientFetch(
        `/api/admin/workshop-progress/${encodeURIComponent(report.id)}/review`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ decision, ...(comment.trim() ? { comment: comment.trim() } : {}) })
        }
      );
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        const message = body?.message ?? 'No fue posible registrar la decisión.';
        if (response.status === 400 || response.status === 409) {
          onConcurrent(message);
          await onReviewed();
        } else setError(message);
        return;
      }
      await onReviewed();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No fue posible registrar la decisión.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="admin-form admin-form-wide">
      <h2 className="font-serif text-2xl">Decidir revisión</h2>
      <p className="notice">{explanation}</p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <label>
        Comentario para rechazo (obligatorio al rechazar)
        <textarea
          disabled={saving}
          onChange={(event) => setComment(event.target.value)}
          value={comment}
        />
      </label>
      <div className="admin-actions">
        <button
          className="button-link"
          disabled={saving}
          onClick={() => void submit('APPROVE')}
          type="button"
        >
          {saving ? 'Guardando…' : 'Aprobar reporte'}
        </button>
        <button
          className="button-link button-link-secondary"
          disabled={saving}
          onClick={() => void submit('REJECT')}
          type="button"
        >
          {saving ? 'Guardando…' : 'Rechazar reporte'}
        </button>
      </div>
    </section>
  );
}
