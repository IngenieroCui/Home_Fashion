'use client';
import { useCallback, useEffect, useState } from 'react';
import { money } from '@/lib/sales';
type Payment = {
  businessName: string;
  concept: string;
  amount: string;
  status: string;
  canPay: boolean;
  expired: boolean;
  confirmed: boolean;
  reviewRequired: boolean;
};
export function PublicPayment({ token }: { token: string }) {
  const [payment, setPayment] = useState<Payment | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const path = `/api/cobro/${encodeURIComponent(token)}`;
  const load = useCallback(async () => {
    try {
      const response = await fetch(path, { cache: 'no-store', signal: AbortSignal.timeout(15000) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message);
      setPayment(body);
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No fue posible consultar el cobro.');
    }
  }, [path]);
  useEffect(() => {
    void load();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void load();
    }, 10000);
    return () => clearInterval(timer);
  }, [load]);
  async function checkout() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch(path, { method: 'POST', signal: AbortSignal.timeout(15000) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message);
      const url = new URL(body.url);
      if (url.origin !== 'https://checkout.wompi.co' || url.pathname !== '/p/')
        throw new Error('El enlace de pago no es válido.');
      window.location.assign(url.href);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No fue posible abrir Wompi.');
      setBusy(false);
    }
  }
  const message = !payment
    ? 'Consultando cobro…'
    : payment.reviewRequired
      ? 'El comercio está revisando la confirmación. No repitas el pago.'
      : payment.confirmed
        ? 'Pago aprobado y abono confirmado. Gracias por tu compra.'
        : payment.status === 'APPROVED'
          ? 'Confirmación en proceso. No repitas el pago.'
          : payment.status === 'DECLINED'
            ? 'Pago rechazado. Comunícate con el comercio para solicitar otro cobro.'
            : payment.status === 'ERROR' || payment.status === 'VOIDED'
              ? 'No se completó el pago. Comunícate con el comercio.'
              : payment.expired
                ? 'Este enlace venció. Solicita un nuevo cobro al comercio.'
                : 'El pago está pendiente. La confirmación puede tardar unos minutos.';
  return (
    <main className="container section-space">
      <section className="admin-section admin-stack" style={{ maxWidth: 620, margin: '0 auto' }}>
        <p className="eyebrow">Home Fashion</p>
        <h1 className="font-serif text-4xl">Tu abono, en línea</h1>
        <p className="notice">Demostración · Wompi Sandbox · sin dinero real</p>
        {payment && (
          <>
            <p>{payment.concept}</p>
            <p className="font-serif text-4xl">{money(payment.amount)}</p>
            <p>Estado: {payment.status}</p>
          </>
        )}
        <p role="status">{message}</p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {payment?.canPay && (
          <button
            className="button-link"
            type="button"
            disabled={busy || !!error}
            onClick={() => void checkout()}
          >
            {busy ? 'Abriendo…' : 'Continuar a Wompi'}
          </button>
        )}
        <button className="text-link" type="button" onClick={() => void load()}>
          Consultar estado
        </button>
        <p>
          Los medios disponibles, como tarjetas, Nequi y PSE, se muestran en Wompi según la
          configuración del comercio.
        </p>
      </section>
    </main>
  );
}
