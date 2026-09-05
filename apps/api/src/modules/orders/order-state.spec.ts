import { deriveOrderStatus } from './order-state';
import { OrderItemStatus, OrderStatus } from './orders.types';

describe('deriveOrderStatus', () => {
  const order = (status = OrderStatus.OPEN) => ({ status });
  const items = (...statuses: OrderItemStatus[]) => statuses.map((status) => ({ status }));

  it.each([
    ['initial active items', order(), items(OrderItemStatus.RESERVED, OrderItemStatus.PENDING_PRODUCTION), OrderStatus.OPEN],
    ['production has started', order(), items(OrderItemStatus.IN_PRODUCTION, OrderItemStatus.READY), OrderStatus.IN_PROGRESS],
    ['an advanced item is mixed with an initial item', order(), items(OrderItemStatus.READY, OrderItemStatus.PENDING_PRODUCTION), OrderStatus.IN_PROGRESS],
    ['a ready item plus a delivered item', order(OrderStatus.IN_PROGRESS), items(OrderItemStatus.READY, OrderItemStatus.DELIVERED), OrderStatus.READY],
    ['all active items are ready', order(OrderStatus.IN_PROGRESS), items(OrderItemStatus.READY, OrderItemStatus.READY), OrderStatus.READY],
    ['all active items are delivered', order(OrderStatus.READY), items(OrderItemStatus.DELIVERED, OrderItemStatus.DELIVERED), OrderStatus.COMPLETED],
    ['cancelled items are excluded', order(OrderStatus.IN_PROGRESS), items(OrderItemStatus.READY, OrderItemStatus.CANCELLED), OrderStatus.READY],
    ['a cancelled order is preserved', order(OrderStatus.CANCELLED), items(OrderItemStatus.DELIVERED), OrderStatus.CANCELLED]
  ])('returns %s state', (_name, currentOrder, currentItems, expected) => {
    expect(deriveOrderStatus(currentOrder as never, currentItems as never)).toBe(expected);
  });
});
