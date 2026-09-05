import { orderStatusLabel, type OrderStatus } from '@/lib/orders';
export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <span className="admin-status">{orderStatusLabel[status]}</span>;
}
