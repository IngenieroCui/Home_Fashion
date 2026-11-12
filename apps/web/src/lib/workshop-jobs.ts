import type { OrderItemStatus, OrderStatus } from './orders';
import { formatDateTime as sharedDateTime } from './formatters';
import { formatDate as sharedDate } from './formatters';
import type { WorkshopProgressHistoryEntry } from './workshop-progress';

export type WorkshopJobStatus =
  'ASSIGNED' | 'IN_PROGRESS' | 'READY_FOR_REVIEW' | 'COMPLETED' | 'CANCELLED';

export type WorkshopUser = {
  id: string;
  name: string;
  email: string;
  active: boolean;
  role: 'WORKSHOP';
};

export type WorkshopUserReference = {
  id: string;
  fullName: string;
  email: string;
  isActive?: boolean;
};

export type WorkshopUserPage = {
  data: WorkshopUser[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

export type WorkshopJobSummary = {
  id: string;
  code: string;
  status: WorkshopJobStatus;
  expectedCompletionDate: string | null;
  workshopUser: Pick<WorkshopUserReference, 'id' | 'fullName'>;
};

export type WorkshopJobListItem = {
  id: string;
  code: string;
  status: WorkshopJobStatus;
  expectedCompletionDate: string | null;
  assignedAt: string;
  workshopUser: WorkshopUserReference;
  orderItemId: string;
  orderId: string;
  orderCode: string;
  customer: { id: string; fullName: string; phone: string | null } | null;
  productNameSnapshot: string;
  imageUrlSnapshot: string | null;
  variantNameSnapshot: string | null;
  quantity: number;
};

export type WorkshopJob = {
  id: string;
  code: string;
  status: WorkshopJobStatus;
  instructions: string | null;
  expectedCompletionDate: string | null;
  assignedAt: string;
  workshopUser: WorkshopUserReference;
  assignedByUser: WorkshopUserReference;
  order: {
    id: string;
    code: string;
    status: OrderStatus;
    promisedDate: string | null;
    notes: string | null;
  };
  customer: { id: string; fullName: string; phone: string | null } | null;
  orderItem: {
    id: string;
    productNameSnapshot: string;
    imageUrlSnapshot: string | null;
    variantNameSnapshot: string | null;
    skuSnapshot: string | null;
    customization: Record<string, unknown> | null;
    quantity: number;
    supplyType: 'IN_STOCK' | 'MADE_TO_ORDER';
    status: OrderItemStatus;
    notes: string | null;
  };
  progressReports: WorkshopProgressHistoryEntry[];
};

export type WorkshopJobPage = {
  data: WorkshopJobListItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

export type CreateWorkshopJobInput = {
  orderItemId: string;
  workshopUserId: string;
  instructions?: string;
  expectedCompletionDate?: string;
};

export const workshopJobStatusLabel: Record<WorkshopJobStatus, string> = {
  ASSIGNED: 'Asignado',
  IN_PROGRESS: 'En fabricación',
  READY_FOR_REVIEW: 'Pendiente de revisión',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado'
};

export const formatDate = sharedDate;

export const formatDateTime = sharedDateTime;

export function formatCustomization(values: Record<string, unknown> | null) {
  if (!values) return [];
  const labels: Record<string, string> = {
    dimensions: 'Dimensiones',
    seats: 'Puestos',
    material: 'Material',
    fabric: 'Tela',
    color: 'Color',
    finish: 'Acabado',
    observations: 'Observaciones',
    details: 'Detalles solicitados',
    accessRestrictions: 'Restricciones de acceso'
  };
  return Object.entries(values)
    .filter(([key, value]) => key in labels && value !== null && value !== '')
    .map(([key, value]) => ({ label: labels[key], value: String(value) }));
}
