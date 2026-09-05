import { OrderDetail } from '@/components/order-detail';
import { requireOrderManage } from '@/lib/auth/customer-quote-access';
export const dynamic = 'force-dynamic';
export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireOrderManage();
  const { id } = await params;
  return (
    <OrderDetail
      canWorkshopManage={user.role === 'ADMIN' || user.permissions.includes('WORKSHOP_MANAGE')}
      id={id}
    />
  );
}
