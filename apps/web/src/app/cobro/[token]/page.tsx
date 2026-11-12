import type { Metadata } from 'next';
import { PublicPayment } from '@/components/public-payment';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Cobro | Home Fashion',
  robots: { index: false, follow: false },
  referrer: 'no-referrer'
};
export default async function PaymentPage({ params }: { params: Promise<{ token: string }> }) {
  return <PublicPayment token={(await params).token} />;
}
