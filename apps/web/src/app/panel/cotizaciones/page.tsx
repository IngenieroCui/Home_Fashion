import { QuoteList } from '@/components/customer-quote';
import { requireQuoteManage } from '@/lib/auth/customer-quote-access';
export const dynamic = 'force-dynamic';
export default async function QuotesPage() {
  await requireQuoteManage();
  return <QuoteList />;
}
