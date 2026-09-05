import { DeliveriesList } from '@/components/deliveries-list';
import { requireOrderManage } from '@/lib/auth/customer-quote-access';

export const dynamic = 'force-dynamic';

export default async function DeliveriesPage() {
  await requireOrderManage();
  return <DeliveriesList />;
}
