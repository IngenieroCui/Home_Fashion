import { OrdersList } from '@/components/orders-list';
import { requireOrderManage } from '@/lib/auth/customer-quote-access';
export const dynamic = 'force-dynamic';
export default async function OrdersPage() {
  await requireOrderManage();
  return <OrdersList />;
}
