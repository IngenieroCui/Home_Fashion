import {
  workshopProgressReviewStatusLabel,
  workshopProgressTypeLabel,
  type WorkshopProgressReviewStatus,
  type WorkshopProgressType
} from '@/lib/workshop-progress';

export function WorkshopProgressTypeBadge({ type }: { type: WorkshopProgressType }) {
  return <span className="admin-status progress-type">{workshopProgressTypeLabel[type]}</span>;
}

export function ReviewStatusBadge({ status }: { status: WorkshopProgressReviewStatus }) {
  return (
    <span className={`admin-status progress-review-${status.toLowerCase()}`}>
      {workshopProgressReviewStatusLabel[status]}
    </span>
  );
}
