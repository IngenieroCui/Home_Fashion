import { money, type Sale } from '@/lib/sales';
export function SaleFinancialSummary({
  sale,
  canMarginView
}: {
  sale: Sale;
  canMarginView: boolean;
}) {
  return (
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
  );
}
