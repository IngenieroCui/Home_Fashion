import { QuoteSaleConversion } from '@/components/quote-sale-conversion';
import { QuoteEditor } from '@/components/customer-quote';
import { requireQuoteManage } from '@/lib/auth/customer-quote-access';
export const dynamic = 'force-dynamic';
export default async function QuotePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireQuoteManage();
  const { id } = await params;
  const has = (permission: string) =>
    user.role === 'ADMIN' || user.permissions.includes(permission);
  return (
    <>
      <QuoteSaleConversion enabled={has('SALE_MANAGE')} quoteId={id} />
      <QuoteEditor canOverride={has('SALE_PRICE_OVERRIDE')} id={id} />
    </>
  );
}
