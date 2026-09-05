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
    status: string;
    promisedDate: string | null;
    notes: string | null;
  };
  customer: { id: string; fullName: string; phone: string | null } | null;
  orderItem: {
    id: string;
    productNameSnapshot: string;
    variantNameSnapshot: string | null;
    skuSnapshot: string | null;
    customization: Record<string, unknown> | null;
    quantity: number;
    supplyType: 'IN_STOCK' | 'MADE_TO_ORDER';
    status: string;
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

export function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.valueOf()) ? '—' : date.toLocaleDateString('es-CO');
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? '—' : date.toLocaleString('es-CO');
}

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
