import { CustomerDetail } from '@/components/customer-detail';
import { requireCustomerManage } from '@/lib/auth/customer-quote-access';
export const dynamic = 'force-dynamic';
export default async function CustomerPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  await requireCustomerManage();
  const { id } = await params;
  const { created } = await searchParams;
  return <CustomerDetail created={created === '1'} id={id} />;
}
