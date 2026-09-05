import { WorkshopJobDetail } from '@/components/workshop-job-detail';
import { requireWorkshopManage } from '@/lib/auth/customer-quote-access';

export const dynamic = 'force-dynamic';

export default async function WorkshopJobPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireWorkshopManage();
  const { id } = await params;
  return (
    <WorkshopJobDetail
      canReview={user.role === 'ADMIN' || user.permissions.includes('PROGRESS_REVIEW')}
      id={id}
    />
  );
}
