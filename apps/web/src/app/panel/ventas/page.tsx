import { SalesList } from '@/components/sales-list';
import { requireSaleManage } from '@/lib/auth/customer-quote-access';
export const dynamic = 'force-dynamic';
export default async function SalesPage() {
  await requireSaleManage();
  return <SalesList />;
}
