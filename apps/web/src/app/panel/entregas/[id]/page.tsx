import { DeliveryDetail } from '@/components/delivery-detail';
import { requireOrderManage } from '@/lib/auth/customer-quote-access';

export const dynamic = 'force-dynamic';

export default async function DeliveryPage({ params }: { params: Promise<{ id: string }> }) {
  await requireOrderManage();
  const { id } = await params;
  return <DeliveryDetail id={id} />;
}
