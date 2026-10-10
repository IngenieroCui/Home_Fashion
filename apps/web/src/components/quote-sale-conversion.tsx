'use client';
import { clientFetch } from '@/lib/client-fetch';
import { confirmAction } from '@/lib/confirm-action';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
type Quote = { id: string; status: string };
export function QuoteSaleConversion({ quoteId, enabled }: { quoteId: string; enabled: boolean }) {
  const router = useRouter();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sale, setSale] = useState<{ id: string; code: string } | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    setLoaded(false);
    setSale(null);
    setQuote(null);
    setError(null);
    clientFetch(`/api/admin/sales?quoteId=${encodeURIComponent(quoteId)}&limit=1`)
      .then(async (response) => {
        if (!response.ok) throw new Error('No fue posible comprobar si la cotización ya tiene una venta.');
        const body = await response.json() as { data: { id: string; code: string }[] };
        if (active) { setSale(body.data[0] ?? null); setLoaded(true); }
      })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : 'No fue posible consultar la venta.'); });
    clientFetch(`/api/admin/quotes/${quoteId}`)
      .then(async (response) => {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        if (!response.ok) throw new Error(body?.message ?? 'No fue posible cargar la cotización.');
        return body as Quote;
      })
      .then((value) => { if (active) setQuote(value); })
      .catch((reason) =>
        active && setError(reason instanceof Error ? reason.message : 'No fue posible cargar la cotización.')
      );
    return () => { active = false; };
  }, [quoteId, enabled]);
  async function convert() {
    if (saving || !loaded || sale) return;
    setSaving(true);
    setError(null);
    try {
      if (!(await confirmAction('¿Convertir esta cotización aceptada en una venta? Se creará el registro comercial correspondiente.', 'Crear venta'))) return;
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
      <h2 className="font-serif text-2xl">{sale ? 'Venta vinculada' : 'Convertir en venta'}</h2>
      <p>{sale ? 'Esta cotización ya fue convertida en venta.' : 'La venta conservará precios y snapshots de esta cotización.'}</p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {sale ? <Link className="button-link" href={`/panel/ventas/${sale.id}`}>Ver venta {sale.code}</Link> : <button className="button-link" disabled={saving || !loaded} onClick={convert} type="button">
        {saving ? 'Convirtiendo…' : 'Convertir en venta'}
      </button>}
    </section>
  );
}
