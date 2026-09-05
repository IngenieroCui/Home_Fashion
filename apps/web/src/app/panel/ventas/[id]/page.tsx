import { SaleDetail } from '@/components/sale-detail';
import { requireSaleManage } from '@/lib/auth/customer-quote-access';
export const dynamic = 'force-dynamic';
export default async function SalePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireSaleManage();
  const { id } = await params;
  const has = (permission: string) =>
    user.role === 'ADMIN' || user.permissions.includes(permission);
  return (
    <SaleDetail
      canCostView={has('FINANCIAL_COST_VIEW')}
      canMarginView={has('FINANCIAL_MARGIN_VIEW')}
      canPaymentCorrect={has('FINANCIAL_PAYMENT_CORRECT')}
      canPaymentRegister={has('FINANCIAL_PAYMENT_REGISTER')}
      canOrderManage={has('ORDER_MANAGE')}
      id={id}
    />
  );
}
