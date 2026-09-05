import { money, type Sale } from '@/lib/sales';
import { PaymentStatusBadge } from './payment-status-badge';

export function PaymentSummary({ sale }: { sale: Sale }) {
  return (
    <section className="admin-section quote-totals">
      <h2 className="font-serif text-2xl">Resumen de pagos</h2>
      <p>
        <span>Total de la venta</span>
        <strong>{money(sale.total)}</strong>
      </p>
      <p>
        <span>Total pagado</span>
        <strong>{money(sale.amountPaid)}</strong>
      </p>
      <p>
        <span>Saldo pendiente</span>
        <strong>{money(sale.balance)}</strong>
      </p>
      <p>
        <span>Estado de pago</span>
        <PaymentStatusBadge status={sale.paymentStatus} />
      </p>
    </section>
  );
}
