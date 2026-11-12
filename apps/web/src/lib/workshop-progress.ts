import type { OrderItemStatus } from './orders';
import type { WorkshopJobStatus, WorkshopUserReference } from './workshop-jobs';

export type WorkshopProgressType = 'STARTED' | 'PROGRESS' | 'READY_FOR_REVIEW';
export type WorkshopProgressReviewStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
export type WorkshopProgressReviewDecision = 'APPROVE' | 'REJECT';

export type WorkshopProgressListItem = {
  id: string;
  type: WorkshopProgressType;
  message: string;
  progressPercent: number | null;
  reviewStatus: WorkshopProgressReviewStatus;
  submittedAt: string;
  workshop: WorkshopUserReference | null;
  workshopJob: { id: string; code: string; status: WorkshopJobStatus };
  order: { id: string; code: string };
  customer: { id: string; fullName: string; phone: string | null } | null;
  product: { name: string; variant: string | null; sku: string | null };
  quantity: number;
};

export type WorkshopProgressReport = {
  id: string;
  type: WorkshopProgressType;
  message: string;
  progressPercent: number | null;
  evidenceUrls: string[] | null;
  reviewStatus: WorkshopProgressReviewStatus;
  submittedAt: string;
  reviewedAt: string | null;
  reviewComment: string | null;
  submittedByUser: WorkshopUserReference | null;
  reviewedByUser: WorkshopUserReference | null;
  workshop: WorkshopUserReference | null;
  workshopJob: {
    id: string;
    code: string;
    status: WorkshopJobStatus;
    instructions: string | null;
    expectedCompletionDate: string | null;
    assignedAt: string;
  };
  order: { id: string; code: string };
  customer: { id: string; fullName: string; phone: string | null } | null;
  orderItem: {
    id: string;
    productNameSnapshot: string;
    imageUrlSnapshot: string | null;
    variantNameSnapshot: string | null;
    skuSnapshot: string | null;
    customization: Record<string, unknown> | null;
    quantity: number;
    notes: string | null;
    status: OrderItemStatus;
  };
};

export type WorkshopProgressPage = {
  data: WorkshopProgressListItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

export type WorkshopProgressHistoryEntry = Pick<
  WorkshopProgressReport,
  | 'id'
  | 'type'
  | 'message'
  | 'progressPercent'
  | 'evidenceUrls'
  | 'reviewStatus'
  | 'submittedAt'
  | 'reviewedAt'
  | 'reviewComment'
>;

export const workshopProgressTypeLabel: Record<WorkshopProgressType, string> = {
  STARTED: 'Inicio de fabricación',
  PROGRESS: 'Avance',
  READY_FOR_REVIEW: 'Listo para revisión'
};

export const workshopProgressReviewStatusLabel: Record<WorkshopProgressReviewStatus, string> = {
  PENDING_REVIEW: 'Pendiente de revisión',
  APPROVED: 'Aprobado',
  REJECTED: 'Rechazado'
};
