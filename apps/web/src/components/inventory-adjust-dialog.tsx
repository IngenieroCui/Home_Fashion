'use client';
import { useActionFeedback } from './ui/action-feedback';
import { Dialog } from './ui/dialog';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { clientFetch } from '@/lib/client-fetch';
import type { InventoryRow } from '@/lib/inventory';
export function InventoryAdjustDialog({
  row,
  onClose,
  onSaved
}: {
  row: InventoryRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const notify = useActionFeedback();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = Number(new FormData(event.currentTarget).get('quantityOnHand'));
    if (!Number.isInteger(next) || next < row.quantityReserved) {
      setError('No puedes reducir las existencias por debajo de las unidades reservadas.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const response = await clientFetch(
        `/api/admin/catalog/variants/${encodeURIComponent(row.variantId)}`,
        {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ quantityOnHand: next })
        }
      );
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok)
        throw new Error(
          body?.message || 'No pudimos ajustar las existencias. Vuelve a intentarlo.'
        );
      notify('Inventario ajustado');
      onSaved();
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No pudimos ajustar las existencias.');
    } finally {
      setSaving(false);
    }
  }
  return (
    <Dialog
      ref={ref}
      className="inventory-dialog"
      aria-labelledby="inventory-adjust-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!saving) onClose();
      }}
    >
      <form className="admin-form" onSubmit={submit}>
        <h2 id="inventory-adjust-title" className="font-serif text-2xl">
          Ajustar existencia
        </h2>
        <p>
          <strong>{row.productName}</strong> · {row.variantName || row.sku}
        </p>
        <dl className="record-values">
          <div>
            <dt>Existencias actuales</dt>
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
        <label>
          Nueva existencia física
          <input
            inputMode="numeric"
            autoFocus
            required
            type="number"
            step="1"
            min={row.quantityReserved}
            name="quantityOnHand"
            defaultValue={row.quantityOnHand}
          />
        </label>
        <p className="notice">Las reservas son gestionadas automáticamente por los pedidos.</p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="admin-actions">
          <button className="button-link" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar ajuste'}
          </button>
          <button
            className="button-link button-link-secondary"
            type="button"
            disabled={saving}
            onClick={onClose}
          >
            Cancelar
          </button>
        </div>
      </form>
    </Dialog>
  );
}
