import { CustomerList } from '@/components/customer-list';
import { requireCustomerManage } from '@/lib/auth/customer-quote-access';
export const dynamic = 'force-dynamic';
export default async function CustomersPage() {
  await requireCustomerManage();
  return <CustomerList />;
}
