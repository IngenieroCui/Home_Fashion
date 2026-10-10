import { SaleForm } from '@/components/sale-form';
import { requireSaleManage } from '@/lib/auth/customer-quote-access';
export const dynamic = 'force-dynamic';
export default async function NewSalePage({ searchParams }: { searchParams: Promise<{ customerId?: string }> }) {
  const user = await requireSaleManage();
  const { customerId } = await searchParams;
  return (
    <SaleForm initialCustomerId={customerId}
      canOverride={user.role === 'ADMIN' || user.permissions.includes('SALE_PRICE_OVERRIDE')}
    />
  );
}
