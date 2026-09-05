'use client';

import { clientFetch } from '@/lib/client-fetch';
import { useEffect, useState, type FormEvent } from 'react';
import {
  money,
  paymentMethodLabel,
  paymentTypeLabel,
  type AdjustmentEffect,
  type PaymentMethod,
  type PaymentType
} from '@/lib/sales';

const types = Object.keys(paymentTypeLabel) as PaymentType[];
const methods = Object.keys(paymentMethodLabel) as PaymentMethod[];
const localDateTime = () => {
  const date = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export function PaymentForm({
  saleId,
  balance,
  onChanged
}: {
  saleId: string;
  balance: string | null | undefined;
  onChanged: () => Promise<void>;
}) {
  const [type, setType] = useState<PaymentType>('DEPOSIT');
  const [amount, setAmount] = useState('');
  const [paidAt, setPaidAt] = useState(localDateTime);
  const [adjustmentEffect, setAdjustmentEffect] = useState<AdjustmentEffect | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (type !== 'ADJUSTMENT') setAdjustmentEffect('');
    if (type === 'FINAL_PAYMENT' && balance !== null && balance !== undefined) setAmount(balance);
  }, [type, balance]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const parsed = Number(amount);
    if (!amount.trim() || !Number.isFinite(parsed) || parsed <= 0) {
      setError('Ingresa un monto mayor que cero.');
      return;
    }
    if (type === 'ADJUSTMENT' && !adjustmentEffect) {
      setError('Selecciona el efecto del ajuste.');
      return;
    }
    const paymentDate = new Date(paidAt);
    if (Number.isNaN(paymentDate.getTime())) {
      setError('Ingresa una fecha y hora válidas.');
      return;
    }
    const form = event.currentTarget;
    const data = new FormData(event.currentTarget);
    setSaving(true);
    try {
      const response = await clientFetch(
        `/api/admin/sales/${encodeURIComponent(saleId)}/payments`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            type,
            method: data.get('method'),
            amount: amount.trim(),
            paidAt: paymentDate.toISOString(),
            reference: String(data.get('reference') ?? '').trim() || undefined,
            notes: String(data.get('notes') ?? '').trim() || undefined,
            evidenceUrl: String(data.get('evidenceUrl') ?? '').trim() || undefined,
            ...(type === 'ADJUSTMENT' ? { adjustmentEffect } : {})
          })
        }
      );
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) throw new Error(body?.message ?? 'No fue posible registrar el movimiento.');
      setAmount('');
      setPaidAt(localDateTime());
      setAdjustmentEffect('');
      form.reset();
      await onChanged();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'No fue posible registrar el movimiento.'
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <form className="admin-form admin-form-wide" onSubmit={submit}>
      <h2 className="font-serif text-2xl">Registrar movimiento</h2>
      <p className="notice">
        Saldo informado por la venta: {money(balance)}. El backend confirma el valor final.
      </p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <label>
        Tipo
        <select
          value={type}
          onChange={(event) => {
            const nextType = event.target.value as PaymentType;
            setType(nextType);
            if (nextType !== 'ADJUSTMENT') setAdjustmentEffect('');
          }}
        >
          {types.map((value) => (
            <option key={value} value={value}>
              {paymentTypeLabel[value]}
            </option>
          ))}
        </select>
      </label>
      <label>
        Método
        <select defaultValue="CASH" name="method">
          {methods.map((value) => (
            <option key={value} value={value}>
              {paymentMethodLabel[value]}
            </option>
          ))}
        </select>
      </label>
      <label>
        Monto
        <input
          inputMode="decimal"
          min="0.01"
          onChange={(event) => setAmount(event.target.value)}
          placeholder="0.00"
          required
          step="0.01"
          type="number"
          value={amount}
        />
      </label>
      <label>
        Fecha y hora del movimiento
        <input
          onChange={(event) => setPaidAt(event.target.value)}
          required
          type="datetime-local"
          value={paidAt}
        />
      </label>
      {type === 'ADJUSTMENT' && (
        <label>
          Efecto del ajuste
          <select
            onChange={(event) => setAdjustmentEffect(event.target.value as AdjustmentEffect)}
            required
            value={adjustmentEffect}
          >
            <option value="">Selecciona una opción</option>
            <option value="ADD_TO_PAID">Sumar al total pagado</option>
            <option value="SUBTRACT_FROM_PAID">Restar del total pagado</option>
          </select>
        </label>
      )}
      <label>
        Referencia opcional
        <input name="reference" />
      </label>
      <label>
        Enlace de evidencia opcional
        <input name="evidenceUrl" placeholder="https://…" type="url" />
      </label>
      <label>
        Notas opcionales
        <textarea name="notes" />
      </label>
      <div className="admin-actions">
        <button className="button-link" disabled={saving} type="submit">
          {saving ? 'Registrando…' : 'Registrar movimiento'}
        </button>
      </div>
    </form>
  );
}
