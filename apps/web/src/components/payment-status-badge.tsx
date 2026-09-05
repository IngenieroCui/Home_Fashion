import { paymentStatusLabel, type PaymentStatus } from '@/lib/sales';

export function PaymentStatusBadge({ status }: { status: PaymentStatus | null | undefined }) {
  if (!status) return <span className="admin-status">—</span>;
  return (
    <span className={`admin-status payment-status-${status.toLowerCase()}`}>
      {paymentStatusLabel[status]}
    </span>
  );
}
