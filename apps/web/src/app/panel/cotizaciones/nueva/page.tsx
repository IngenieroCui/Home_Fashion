import Link from 'next/link';
import { QuoteHeaderForm } from '@/components/customer-quote';
import { requireQuoteManage } from '@/lib/auth/customer-quote-access';
export const dynamic = 'force-dynamic';
export default async function NewQuotePage() {
  await requireQuoteManage();
  return (
    <div className="admin-stack">
      <section className="admin-heading">
        <div>
          <Link className="text-link" href="/panel/cotizaciones">
            ← Cotizaciones
          </Link>
          <p className="eyebrow">Cotizaciones</p>
          <h1 className="font-serif text-4xl">Nueva cotización</h1>
        </div>
      </section>
      <QuoteHeaderForm />
    </div>
  );
}
