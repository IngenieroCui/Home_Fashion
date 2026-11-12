'use client';

import { formatDateTime as formatDate } from '@/lib/formatters';
import { EvidenceLinks } from './evidence-links';
import { clientFetch } from '@/lib/client-fetch';
import { useState } from 'react';
import { money, paymentMethodLabel, paymentTypeLabel, type SalePayment } from '@/lib/sales';

export function PaymentsHistory({
  saleId,
  payments,
  canCorrect,
  onChanged
}: {
  saleId: string;
  payments: SalePayment[];
  canCorrect: boolean;
  onChanged: () => Promise<void>;
}) {
  const [voidingId, setVoidingId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  async function voidPayment(paymentId: string) {
    const normalizedReason = reason.trim();
    if (!normalizedReason) {
      setError('Indica el motivo de la anulación.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await clientFetch(
        `/api/admin/sales/${encodeURIComponent(saleId)}/payments/${encodeURIComponent(paymentId)}/void`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ reason: normalizedReason })
        }
      );
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) throw new Error(body?.message ?? 'No fue posible anular el movimiento.');
      setVoidingId(null);
      setReason('');
      await onChanged();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'No fue posible anular el movimiento.');
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="admin-section">
      <div className="admin-section-title">
        <div>
          <h2 className="font-serif text-2xl">Historial de movimientos</h2>
          <p>Los movimientos anulados permanecen visibles.</p>
        </div>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {!payments.length ? (
        <p className="notice">Esta venta todavía no tiene movimientos registrados.</p>
      ) : (
        <div className="payment-history">
          {payments.map((payment) => (
            <article
              className={`payment-entry payment-entry-${payment.status.toLowerCase()}`}
              key={payment.id}
            >
              <div className="admin-section-title">
                <div>
                  <strong>{paymentTypeLabel[payment.type]}</strong>
                  <p>
                    {paymentMethodLabel[payment.method]} · {money(payment.amount)} ·{' '}
                    {formatDate(payment.paidAt)}
                  </p>
                </div>
                <span className="admin-status">
                  {payment.status === 'VOIDED' ? 'Anulado' : 'Registrado'}
                </span>
              </div>
              {payment.adjustmentEffect && (
                <p>
                  {payment.adjustmentEffect === 'ADD_TO_PAID'
                    ? 'Suma al total pagado'
                    : 'Resta del total pagado'}
                </p>
              )}
              {payment.reference && <p>Referencia: {payment.reference}</p>}
              {payment.notes && <p>Notas: {payment.notes}</p>}
              {payment.evidenceUrl && <EvidenceLinks urls={[payment.evidenceUrl]} />}
              {payment.createdBy && <p>Registró: {payment.createdBy.fullName}</p>}
              {payment.status === 'VOIDED' && (
                <div className="payment-void-detail">
                  <p>Anulado: {formatDate(payment.voidedAt)}</p>
                  {payment.voidedBy && <p>Anuló: {payment.voidedBy.fullName}</p>}
                  {payment.voidReason && <p>Motivo: {payment.voidReason}</p>}
                </div>
              )}
              {canCorrect &&
                payment.status === 'REGISTERED' &&
                (voidingId === payment.id ? (
                  <div className="payment-void-form">
                    <label>
                      Motivo de anulación
                      <textarea
                        autoFocus
                        onChange={(event) => setReason(event.target.value)}
                        value={reason}
                      />
                    </label>
                    <p>El movimiento permanecerá en el historial como anulado.</p>
                    <div className="admin-actions">
                      <button
                        className="button-link"
                        disabled={saving}
                        onClick={() => voidPayment(payment.id)}
                        type="button"
                      >
                        {saving ? 'Anulando…' : 'Confirmar anulación'}
                      </button>
                      <button
                        className="text-link"
                        disabled={saving}
                        onClick={() => {
                          setVoidingId(null);
                          setReason('');
                          setError(null);
                        }}
                        type="button"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="text-link"
                    onClick={() => {
                      setVoidingId(payment.id);
                      setReason('');
                      setError(null);
                    }}
                    type="button"
                  >
                    Anular movimiento
                  </button>
                ))}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
