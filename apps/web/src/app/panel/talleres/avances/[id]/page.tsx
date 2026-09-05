import { WorkshopProgressDetail } from '@/components/workshop-progress-detail';
import { requireProgressReview } from '@/lib/auth/customer-quote-access';

export const dynamic = 'force-dynamic';

export default async function WorkshopProgressDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  await requireProgressReview();
  const { id } = await params;
  return <WorkshopProgressDetail id={id} />;
}
