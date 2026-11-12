'use client';
import { useActionFeedback } from './ui/action-feedback';

import { clientFetch } from '@/lib/client-fetch';
import { useState, type FormEvent } from 'react';
import {
  formatCustomization,
  type CreateWorkshopJobInput,
  type WorkshopUser
} from '@/lib/workshop-jobs';
import { WorkshopUserSelect } from './workshop-user-select';

type ItemReference = {
  id: string;
  productNameSnapshot: string;
  variantNameSnapshot: string | null;
  quantity: number;
  customization: Record<string, unknown> | null;
  notes: string | null;
};

function validDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(date.valueOf()) &&
    date.toISOString().slice(0, 10) === value
  );
}

export function AssignWorkshopJobForm({
  item,
  onAssigned,
  onConflict
}: {
  item: ItemReference;
  onAssigned: () => void;
  onConflict: () => void;
}) {
  const notify = useActionFeedback();
  const [workshopUser, setWorkshopUser] = useState<WorkshopUser | null>(null);
  const [instructions, setInstructions] = useState('');
  const [expectedCompletionDate, setExpectedCompletionDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const references = formatCustomization(item.customization);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!workshopUser) return setError('Selecciona un taller antes de asignar.');
    if (expectedCompletionDate && !validDate(expectedCompletionDate))
      return setError('La fecha esperada no es válida.');
    const payload: CreateWorkshopJobInput = {
      orderItemId: item.id,
      workshopUserId: workshopUser.id
    };
    if (instructions.trim()) payload.instructions = instructions.trim();
    if (expectedCompletionDate) payload.expectedCompletionDate = expectedCompletionDate;
    setSubmitting(true);
    try {
      const response = await clientFetch('/api/admin/workshop-jobs', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        if (response.status === 409) {
          setError(
            body?.message ?? 'Otro usuario pudo haber asignado el elemento. Recargando el pedido.'
          );
          onConflict();
        } else setError(body?.message ?? 'No fue posible crear la asignación.');
        return;
      }
      notify('Trabajo asignado');
      onAssigned();
    } catch {
      setError('No fue posible crear la asignación. Inténtalo de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      className="mt-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
      onSubmit={submit}
    >
      <h3 className="font-serif text-xl">Asignar a taller</h3>
      <p className="mt-2 text-sm">
        <strong>{item.productNameSnapshot}</strong>
        {item.variantNameSnapshot ? ` · ${item.variantNameSnapshot}` : ''} · Cantidad:{' '}
        {item.quantity}
      </p>
      {(references.length > 0 || item.notes) && (
        <div className="mt-2 text-sm">
          <p>Referencia del pedido:</p>
          {references.map((entry) => (
            <p key={entry.label}>
              {entry.label}: {entry.value}
            </p>
          ))}
          {item.notes && <p>Notas: {item.notes}</p>}
        </div>
      )}
      <WorkshopUserSelect onChange={setWorkshopUser} value={workshopUser} />
      <label className="mt-3 block">
        Instrucciones para el taller
        <textarea
          maxLength={4000}
          onChange={(event) => setInstructions(event.target.value)}
          placeholder="Información adicional para fabricar el elemento"
          rows={4}
          value={instructions}
        />
      </label>
      <label className="mt-3 block">
        Fecha esperada
        <input
          onChange={(event) => setExpectedCompletionDate(event.target.value)}
          type="date"
          value={expectedCompletionDate}
        />
      </label>
      {error && (
        <p className="form-error mt-3" role="alert">
          {error}
        </p>
      )}
      <button className="button-link mt-4" disabled={submitting} type="submit">
        {submitting ? 'Asignando…' : 'Crear asignación'}
      </button>
    </form>
  );
}
