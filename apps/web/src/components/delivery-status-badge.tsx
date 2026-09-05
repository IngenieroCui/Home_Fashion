import { deliveryStatusLabel, type DeliveryStatus } from '@/lib/deliveries';

export function DeliveryStatusBadge({ status }: { status: DeliveryStatus }) {
  const className =
    status === 'DELIVERED'
      ? 'admin-status admin-status-active'
      : status === 'CANCELLED'
        ? 'admin-status admin-status-inactive'
        : 'admin-status delivery-status-pending';
  return <span className={className}>{deliveryStatusLabel[status]}</span>;
}
