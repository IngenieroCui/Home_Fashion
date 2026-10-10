import Link from 'next/link';
import { CustomerForm } from '@/components/customer-form';
import { requireCustomerManage } from '@/lib/auth/customer-quote-access';
export const dynamic = 'force-dynamic';
export default async function NewCustomerPage() {
  await requireCustomerManage();
  return (
    <div className="admin-stack">
      <section className="admin-heading">
        <div>
          <Link className="text-link" href="/panel/clientes">
            ← Clientes
          </Link>
          <p className="eyebrow">Clientes</p>
          <h1 className="font-serif text-4xl">Nuevo cliente</h1>
        </div>
      </section>
      <CustomerForm />
    </div>
  );
}
