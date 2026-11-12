import { formatDate } from './formatters';
import { formatDateTime } from './formatters';
export type TrackingAccessStatus =
  | { exists: false; active: false }
  | {
      exists: true;
      active: boolean;
      tokenPrefix: string;
      expiresAt: string | null;
      createdAt: string;
      rotatedAt: string | null;
      revokedAt: string | null;
    };

export type CreateOrRotateTrackingResponse = {
  token: string;
  path: string;
  active: boolean;
  expiresAt: string | null;
  createdAt?: string;
  rotatedAt?: string;
};

export type PublicTrackingTimelineEntry = {
  type: 'STARTED' | 'PROGRESS' | 'READY_FOR_REVIEW';
  message: string;
  progressPercent: number | null;
  evidenceUrls: string[] | null;
  submittedAt: string;
  approvedAt: string | null;
};

export type PublicTrackingItem = {
  publicItemKey: string;
  productNameSnapshot: string;
  imageUrlSnapshot: string | null;
  variantNameSnapshot: string | null;
  skuSnapshot: string | null;
  customization: Record<string, unknown> | null;
  quantity: number;
  supplyType: 'IN_STOCK' | 'MADE_TO_ORDER';
  status: 'RESERVED' | 'PENDING_PRODUCTION' | 'IN_PRODUCTION' | 'READY' | 'DELIVERED' | 'CANCELLED';
  expectedCompletionDate: string | null;
  timeline: PublicTrackingTimelineEntry[];
};

export type PublicOrderTracking = {
  lastPublicUpdateAt?: string;
  orderCode: string;
  orderStatus: 'OPEN' | 'IN_PROGRESS' | 'READY' | 'COMPLETED' | 'CANCELLED';
  promisedDate: string | null;
  createdAt: string;
  items: PublicTrackingItem[];
  delivery: {
    status: 'SCHEDULED' | 'OUT_FOR_DELIVERY' | 'DELIVERED';
    scheduledDate: string;
    timeWindow: string | null;
    deliveredAt: string | null;
    evidenceUrls: string[] | null;
  } | null;
};

export const publicOrderStatusLabel: Record<PublicOrderTracking['orderStatus'], string> = {
  OPEN: 'Pedido creado',
  IN_PROGRESS: 'En proceso',
  READY: 'Listo',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado'
};

export const publicItemStatusLabel: Record<PublicTrackingItem['status'], string> = {
  RESERVED: 'Reservado en inventario',
  PENDING_PRODUCTION: 'Pendiente de fabricación',
  IN_PRODUCTION: 'En fabricación',
  READY: 'Listo',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado'
};

export const publicSupplyTypeLabel: Record<PublicTrackingItem['supplyType'], string> = {
  IN_STOCK: 'Disponible en inventario',
  MADE_TO_ORDER: 'Fabricación bajo pedido'
};

export const publicTimelineTypeLabel: Record<PublicTrackingTimelineEntry['type'], string> = {
  STARTED: 'Fabricación iniciada',
  PROGRESS: 'Avance de fabricación',
  READY_FOR_REVIEW: 'Fabricación terminada'
};

export const formatTrackingDateTime = formatDateTime;

export const formatTrackingDate = formatDate;
