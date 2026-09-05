import { CreateOrderPage } from '@/components/create-order-page';
import { requireOrderManage } from '@/lib/auth/customer-quote-access';
export const dynamic = 'force-dynamic';
export default async function CreateOrderRoute({ params }: { params: Promise<{ id: string }> }) {
  await requireOrderManage();
  const { id } = await params;
  return <CreateOrderPage id={id} />;
}
