'use client';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { clientFetch } from '@/lib/client-fetch';
import { money } from '@/lib/sales';
type Attempt = {
  id: string;
  reference: string;
  amount: string;
  status: string;
  url: string;
  expiresAt: string;
  salePaymentId?: string;
  reviewRequired: boolean;
};
export function PaymentAttempts({
  saleId,
  balance,
  onChanged
}: {
  saleId: string;
  balance: string;
  onChanged: () => Promise<void>;
}) {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState('partial');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState<{ intentId: string; amount: string } | null>(null);
  const inFlight = useRef(false);
  const key = `wompi-attempt:${saleId}`;
  const path = `/api/admin/sales/${encodeURIComponent(saleId)}/payment-attempts`;
  const load = useCallback(async () => {
    const response = await clientFetch(path);
    const body = await response.json();
    if (!response.ok) throw new Error(body.message ?? 'No fue posible consultar los cobros.');
    setAttempts(body);
  }, [path]);
  useEffect(() => {
    void load().catch((error) => setMessage(error.message));
  }, [load]);
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(key);
      if (stored) {
        const value = JSON.parse(stored);
        setPending(value);
        setAmount(value.amount);
        setMode('other');
      }
    } catch {
      setMessage('No fue posible recuperar el intento anterior.');
    }
  }, [key]);
  async function create(event: FormEvent) {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setMessage('');
    try {
      const stored = sessionStorage.getItem(key);
      const payload = stored
        ? JSON.parse(stored)
        : { intentId: crypto.randomUUID(), amount: mode === 'balance' ? balance : amount };
      sessionStorage.setItem(key, JSON.stringify(payload));
      setPending(payload);
      const response = await clientFetch(path, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(20000)
      });
      const body = await response.json();
      if (!response.ok) {
        if (response.status === 400) {
          sessionStorage.removeItem(key);
          setPending(null);
        }
        throw new Error(body.message ?? 'No fue posible generar el cobro.');
      }
      sessionStorage.removeItem(key);
      setPending(null);
      setMessage('Cobro generado. Copia el enlace para compartirlo.');
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Reintenta para recuperar la misma intención.'
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  async function refresh() {
    setBusy(true);
    try {
      await Promise.all([load(), onChanged()]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No fue posible actualizar.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="admin-section admin-stack" aria-labelledby="cobros-title">
      <div>
        <p className="eyebrow">Pagos online · demostración</p>
        <h2 id="cobros-title" className="font-serif text-2xl">
          Generar cobro
        </h2>
      </div>
      <p className="notice">
        Wompi Sandbox · pagos ficticios. Los intentos pendientes no reducen el saldo.
      </p>
      <form className="admin-form" onSubmit={create}>
        <label>
          Concepto del importe
          <select
            value={mode}
            onChange={(event) => setMode(event.target.value)}
            disabled={busy || !!pending}
          >
            <option value="partial">Anticipo parcial</option>
            <option value="balance">Saldo completo</option>
            <option value="other">Otro importe</option>
          </select>
        </label>
        <label>
          Importe en COP
          <input
            type="number"
            min="0.01"
            step="0.01"
            max={balance}
            required
            value={mode === 'balance' ? balance : amount}
            disabled={busy || !!pending || mode === 'balance'}
            onChange={(event) => setAmount(event.target.value)}
          />
        </label>
        <button
          className="button-link"
          disabled={busy || (!pending && Number(balance) <= 0)}
          type="submit"
        >
          {busy ? 'Procesando…' : pending ? 'Recuperar el mismo cobro' : 'Generar cobro'}
        </button>
      </form>
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
      <button type="button" className="text-link" disabled={busy} onClick={() => void refresh()}>
        Actualizar intentos y saldo
      </button>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Referencia</th>
              <th>Importe</th>
              <th>Estado</th>
              <th>Enlace</th>
            </tr>
          </thead>
          <tbody>
            {attempts.map((attempt) => (
              <tr key={attempt.id}>
                <td>
                  {attempt.reference}
                  <small className="item-note">
                    Vence: {new Date(attempt.expiresAt).toLocaleString('es-CO')}
                  </small>
                </td>
                <td>{money(attempt.amount)}</td>
                <td>
                  {attempt.status}
                  {attempt.salePaymentId ? ' · Abono registrado' : ''}
                  {attempt.reviewRequired ? ' · Revisión requerida' : ''}
                </td>
                <td>
                  <a className="text-link" href={attempt.url} target="_blank" rel="noreferrer">
                    Abrir
                  </a>
                  {' · '}
                  <button
                    className="text-link"
                    type="button"
                    onClick={() =>
                      void navigator.clipboard
                        .writeText(attempt.url)
                        .then(() => setMessage('Enlace copiado.'))
                        .catch(() => setMessage('Abre el cobro y copia su dirección.'))
                    }
                  >
                    Copiar enlace
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
