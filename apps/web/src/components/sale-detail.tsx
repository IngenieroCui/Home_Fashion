'use client';
import { LoadingState as AdminSkeleton } from './ui/loading-state';
import { formatDate, formatDateTime } from '@/lib/formatters';

import { ListError } from './page-state';
import { CommerceItemVisual } from './commerce-item-visual';

import { clientFetch } from '@/lib/client-fetch';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { money, type Sale } from '@/lib/sales';
import { SaleFinancialSummary } from './sales/sale-financial-summary';
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
  if (error) return <ListError message={error} retry={() => void refresh()} />;
  if (!sale) return <AdminSkeleton label="Cargando venta" />;
  return (
    <div className="admin-stack">
      <section className="admin-heading">
        <div>
          <Link className="text-link" href="/panel/ventas">
            ← Ventas
          </Link>
          <p className="eyebrow">Venta</p>
          <h1 className="font-serif text-4xl">{sale.code}</h1>
          <p>
            {sale.customer?.fullName ?? 'Cliente'} · {formatDate(sale.createdAt)} ·{' '}
            {sale.quoteId ? 'Cotización' : 'Venta directa'}
          </p>
        </div>
        <span className="admin-status">
          {sale.status === 'CONFIRMED' ? 'Confirmada' : 'Cancelada'}
        </span>
        <div className="admin-actions">
          {canOrderManage && sale.order && (
            <Link className="button-link" href={`/panel/pedidos/${sale.order.id}`}>
              Ver pedido {sale.order.code}
            </Link>
          )}
          {canOrderManage && !sale.order && sale.status === 'CONFIRMED' && (
            <Link className="button-link" href={`/panel/ventas/${sale.id}/crear-pedido`}>
              Crear pedido
            </Link>
          )}
          {canPaymentRegister && sale.status === 'CONFIRMED' && (
            <a className="button-link button-link-secondary" href="#registrar-movimiento">
              Registrar movimiento
            </a>
          )}
        </div>
      </section>
      {sale.warnings?.map((warning) => (
        <p className="notice" key={warning}>
          {warning}
        </p>
      ))}
      <section className="admin-section">
        <p>Origen: {sale.quoteId ? 'Cotización' : 'Venta directa'}</p>
        {sale.quote && <p>Cotización: {sale.quote.code}</p>}
        <p>Fecha: {formatDateTime(sale.createdAt)}</p>
        {sale.createdByUser && <p>Registró: {sale.createdByUser.fullName}</p>}
        <p>Notas: {sale.notes ?? '—'}</p>
      </section>
      <section className="admin-section">
        <h2 className="font-serif text-2xl">Elementos</h2>
        <div className="admin-table-wrap responsive-item-table">
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
                  <td data-label="Producto">
                    <CommerceItemVisual
                      imageUrl={item.imageUrlSnapshot}
                      name={item.productNameSnapshot}
                      variant={item.variantNameSnapshot ?? 'Personalizado'}
                    />
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
                  <td data-label="Cantidad">{item.quantity}</td>
                  <td data-label="Lista">{money(item.unitListPrice)}</td>
                  <td data-label="Venta">{money(item.unitSalePrice)}</td>
                  <td data-label="Descuento">{money(item.discountAmount)}</td>
                  <td data-label="Subtotal">{money(item.subtotal)}</td>
                  {canCostView && (
                    <td data-label="Costo">
                      {item.unitCostSnapshot === null
                        ? 'Costo no registrado'
                        : money(item.unitCostSnapshot)}
                    </td>
                  )}
                  {canMarginView && (
                    <>
                      <td data-label="Utilidad">
                        {item.grossProfit === null
                          ? 'Sin cálculo completo'
                          : money(item.grossProfit)}
                      </td>
                      <td data-label="Margen">
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
      <SaleFinancialSummary sale={sale} canMarginView={canMarginView} />
      {canOrderManage && !sale.order && sale.status === 'CONFIRMED' && (
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
