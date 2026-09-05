'use client';
import { clientFetch } from '@/lib/client-fetch';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { money, type Sale } from '@/lib/sales';
import { PaymentForm } from './payment-form';
import { PaymentsHistory } from './payments-history';
import { PaymentSummary } from './payment-summary';
async function load(id: string) {
  const response = await clientFetch(`/api/admin/sales/${id}`);
  const body = (await response.json().catch(() => null)) as { message?: string } | null;
  if (!response.ok) throw new Error(body?.message ?? 'No fue posible cargar la venta.');
  return body as Sale;
}
export function SaleDetail({
  id,
  canCostView,
  canMarginView,
  canPaymentRegister,
  canPaymentCorrect,
  canOrderManage
}: {
  id: string;
  canCostView: boolean;
  canMarginView: boolean;
  canPaymentRegister: boolean;
  canPaymentCorrect: boolean;
  canOrderManage: boolean;
}) {
  const [sale, setSale] = useState<Sale | null>(null);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    setError(null);
    try {
      setSale(await load(id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No fue posible cargar la venta.');
    }
  }, [id]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  if (error)
    return (
      <p className="form-error" role="alert">
        {error}
      </p>
    );
  if (!sale) return <p className="notice">Cargando venta…</p>;
  return (
    <div className="admin-stack">
      <section className="admin-heading">
        <div>
          <Link className="text-link" href="/panel/ventas">
            ← Ventas
          </Link>
          <p className="eyebrow">{sale.code}</p>
          <h1 className="font-serif text-4xl">Venta de {sale.customer?.fullName ?? 'cliente'}</h1>
        </div>
        <span className="admin-status">
          {sale.status === 'CONFIRMED' ? 'Confirmada' : 'Cancelada'}
        </span>
      </section>
      {sale.warnings?.map((warning) => (
        <p className="notice" key={warning}>
          {warning}
        </p>
      ))}
      <section className="admin-section">
        <p>Origen: {sale.quoteId ? 'Cotización' : 'Venta directa'}</p>
        {sale.quote && <p>Cotización: {sale.quote.code}</p>}
        <p>Fecha: {new Date(sale.createdAt).toLocaleString('es-CO')}</p>
        {sale.createdByUser && <p>Registró: {sale.createdByUser.fullName}</p>}
        <p>Notas: {sale.notes ?? '—'}</p>
      </section>
      <section className="admin-section">
        <h2 className="font-serif text-2xl">Elementos</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>Lista</th>
                <th>Venta</th>
                <th>Descuento</th>
                <th>Subtotal</th>
                {canCostView && <th>Costo</th>}
                {canMarginView && (
                  <>
                    <th>Utilidad</th>
                    <th>Margen</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {sale.items?.map((item) => (
                <tr key={item.id}>
                  <td>
                    {item.productNameSnapshot}
                    {item.variantNameSnapshot
                      ? ` · ${item.variantNameSnapshot}`
                      : ' · Personalizado'}
                    <small className="item-note">
                      {item.skuSnapshot ?? ''}
                      {item.customization
                        ? ` · ${Object.entries(item.customization)
                            .map(([key, value]) => `${key}: ${String(value)}`)
                            .join(' · ')}`
                        : ''}
                      {item.notes ? ` · ${item.notes}` : ''}
                    </small>
                  </td>
                  <td>{item.quantity}</td>
                  <td>{money(item.unitListPrice)}</td>
                  <td>{money(item.unitSalePrice)}</td>
                  <td>{money(item.discountAmount)}</td>
                  <td>{money(item.subtotal)}</td>
                  {canCostView && (
                    <td>
                      {item.unitCostSnapshot === null
                        ? 'Costo no registrado'
                        : money(item.unitCostSnapshot)}
                    </td>
                  )}
                  {canMarginView && (
                    <>
                      <td>
                        {item.grossProfit === null
                          ? 'Sin cálculo completo'
                          : money(item.grossProfit)}
                      </td>
                      <td>
                        {item.margin === null || item.margin === undefined
                          ? '—'
                          : `${item.margin}%`}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="admin-section quote-totals">
        <h2 className="font-serif text-2xl">Resumen</h2>
        <p>Subtotal {money(sale.subtotal)}</p>
        <p>Descuento {money(sale.discountTotal)}</p>
        <p>Entrega {money(sale.deliveryFee)}</p>
        <p>
          <strong>Total {money(sale.total)}</strong>
        </p>
        {canMarginView && sale.financialSummary && (
          <p>
            Utilidad total:{' '}
            {sale.financialSummary.grossProfit === null
              ? 'Sin cálculo completo'
              : money(sale.financialSummary.grossProfit)}
          </p>
        )}
      </section>
      {canOrderManage && sale.status === 'CONFIRMED' && (
        <section className="admin-section">
          <h2 className="font-serif text-2xl">Pedido</h2>
          <p>Clasifica los elementos antes de crear el pedido y reservar inventario.</p>
          <Link className="button-link" href={`/panel/ventas/${sale.id}/crear-pedido`}>
            Crear pedido
          </Link>
        </section>
      )}
      <PaymentSummary sale={sale} />
      {canPaymentRegister && sale.status === 'CONFIRMED' && (
        <PaymentForm balance={sale.balance} onChanged={refresh} saleId={sale.id} />
      )}
      <PaymentsHistory
        canCorrect={canPaymentCorrect}
        onChanged={refresh}
        payments={sale.payments ?? []}
        saleId={sale.id}
      />
    </div>
  );
}
