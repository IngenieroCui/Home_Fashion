import { WorkshopJobsList } from '@/components/workshop-jobs-list';
import { requireWorkshopManage } from '@/lib/auth/customer-quote-access';

export const dynamic = 'force-dynamic';

export default async function WorkshopJobsPage() {
  await requireWorkshopManage();
  return <WorkshopJobsList />;
}
