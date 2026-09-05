import { Transaction } from 'sequelize';
import { OrderItem } from './entities/order-item.model';
import { Order } from './entities/order.model';
import { OrderItemStatus, OrderStatus } from './orders.types';

/**
 * Calculates an order's operational state exclusively from its active items.
 * The caller owns locking the order and its items in the supplied transaction.
 */
export function deriveOrderStatus(order: Pick<Order, 'status'>, items: Array<Pick<OrderItem, 'status'>>): OrderStatus {
  if (order.status === OrderStatus.CANCELLED) return OrderStatus.CANCELLED;

  const activeItems = items.filter((item) => item.status !== OrderItemStatus.CANCELLED);
  if (!activeItems.length) return OrderStatus.OPEN;
  if (activeItems.every((item) => item.status === OrderItemStatus.DELIVERED)) return OrderStatus.COMPLETED;
  if (activeItems.every((item) => item.status === OrderItemStatus.READY || item.status === OrderItemStatus.DELIVERED))
    return OrderStatus.READY;
  if (activeItems.some((item) => [OrderItemStatus.IN_PRODUCTION, OrderItemStatus.READY, OrderItemStatus.DELIVERED].includes(item.status)))
    return OrderStatus.IN_PROGRESS;
  return OrderStatus.OPEN;
}

export async function recalculateOrderStatus(order: Order, items: OrderItem[], transaction: Transaction): Promise<OrderStatus> {
  const status = deriveOrderStatus(order, items);
  if (order.status !== status) await order.update({ status }, { transaction });
  return status;
}
