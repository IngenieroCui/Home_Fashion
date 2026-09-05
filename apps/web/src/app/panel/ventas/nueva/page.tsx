import { SaleForm } from '@/components/sale-form';
import { requireSaleManage } from '@/lib/auth/customer-quote-access';
export const dynamic = 'force-dynamic';
export default async function NewSalePage() {
  const user = await requireSaleManage();
  return (
    <SaleForm
      canOverride={user.role === 'ADMIN' || user.permissions.includes('SALE_PRICE_OVERRIDE')}
    />
  );
}
