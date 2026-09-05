import { workshopJobStatusLabel, type WorkshopJobStatus } from '@/lib/workshop-jobs';

export function WorkshopJobStatusBadge({ status }: { status: WorkshopJobStatus }) {
  return <span className="admin-status">{workshopJobStatusLabel[status]}</span>;
}
