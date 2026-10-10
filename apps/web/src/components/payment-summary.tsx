import { money, type Sale } from '@/lib/sales';
import { PaymentStatusBadge } from './payment-status-badge';
export function PaymentSummary({ sale }: { sale: Sale }) {
  const ratio =
    Number(sale.total) > 0 ? (Number(sale.amountPaid || 0) / Number(sale.total)) * 100 : 0;
  const progress = Math.max(0, Math.min(100, Number.isFinite(ratio) ? ratio : 0));
  return (
    <section className="admin-section payment-summary">
      <p className="eyebrow">Total de la venta</p>
      <h2 className="font-serif text-4xl">{money(sale.total)}</h2>
      <div
        className="payment-progress"
        role="progressbar"
        aria-label="Progreso del pago"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
      >
        <span style={{ width: `${progress}%` }} />
      </div>
      <div className="payment-summary-values">
        <div>
          <span>Pagado</span>
          <strong>{money(sale.amountPaid)}</strong>
        </div>
        <div>
          <span>Pendiente</span>
          <strong>{money(sale.balance)}</strong>
        </div>
      </div>
      <PaymentStatusBadge status={sale.paymentStatus} />
    </section>
  );
}
