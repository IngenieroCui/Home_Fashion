import { WorkshopProgressList } from '@/components/workshop-progress-list';
import { requireProgressReview } from '@/lib/auth/customer-quote-access';

export const dynamic = 'force-dynamic';

export default async function WorkshopProgressPage() {
  await requireProgressReview();
  return <WorkshopProgressList />;
}
