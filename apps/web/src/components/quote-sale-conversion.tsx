'use client';
import { clientFetch } from '@/lib/client-fetch';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
type Quote = { id: string; status: string };
export function QuoteSaleConversion({ quoteId, enabled }: { quoteId: string; enabled: boolean }) {
  const router = useRouter();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    clientFetch(`/api/admin/quotes/${quoteId}`)
      .then(async (response) => {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        if (!response.ok) throw new Error(body?.message ?? 'No fue posible cargar la cotización.');
        return body as Quote;
      })
      .then(setQuote)
      .catch((reason) =>
        setError(reason instanceof Error ? reason.message : 'No fue posible cargar la cotización.')
      );
  }, [quoteId]);
  async function convert() {
    if (!window.confirm('¿Convertir esta cotización aceptada en una venta?')) return;
    setSaving(true);
    setError(null);
    try {
      const response = await clientFetch(`/api/admin/sales/from-quote/${quoteId}`, {
        method: 'POST'
      });
      const body = (await response.json().catch(() => null)) as {
        id?: string;
        message?: string;
      } | null;
      if (!response.ok || !body?.id)
        throw new Error(body?.message ?? 'No fue posible convertir la cotización.');
      router.replace(`/panel/ventas/${body.id}`);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'No fue posible convertir la cotización.'
      );
    } finally {
      setSaving(false);
    }
  }
  if (!enabled || quote?.status !== 'ACCEPTED')
    return error ? (
      <p className="form-error" role="alert">
        {error}
      </p>
    ) : null;
  return (
    <section className="admin-section">
      <h2 className="font-serif text-2xl">Convertir en venta</h2>
      <p>La venta conservará precios y snapshots de esta cotización.</p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="button-link" disabled={saving} onClick={convert} type="button">
        {saving ? 'Convirtiendo…' : 'Convertir en venta'}
      </button>
    </section>
  );
}
