'use client';
import { clientFetch } from '@/lib/client-fetch';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Sale } from '@/lib/sales';
import { CreateOrderForm } from './create-order-form';
export function CreateOrderPage({ id }: { id: string }) {
  const [sale, setSale] = useState<Sale | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    clientFetch(`/api/admin/sales/${encodeURIComponent(id)}`)
      .then(async (response) => {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        if (!response.ok) throw new Error(body?.message ?? 'No fue posible cargar la venta.');
        return body as Sale;
      })
      .then(setSale)
      .catch((reason) =>
        setError(reason instanceof Error ? reason.message : 'No fue posible cargar la venta.')
      );
  }, [id]);
  if (error)
    return (
      <p className="form-error" role="alert">
        {error}
      </p>
    );
  if (!sale) return <p className="notice">Cargando venta…</p>;
  if (sale.status !== 'CONFIRMED')
    return <p className="form-error">Solo las ventas confirmadas pueden crear pedidos.</p>;
  return (
    <div className="admin-stack">
      <Link className="text-link" href={`/panel/ventas/${sale.id}`}>
        ← Volver a la venta
      </Link>
      <CreateOrderForm sale={sale} />
    </div>
  );
}
