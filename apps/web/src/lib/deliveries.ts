import { formatMoney } from './formatters';
import { formatDateTime } from './formatters';
import { formatDate } from './formatters';
import type { OrderItemStatus, OrderStatus, OrderSupplyType } from './orders';

export type DeliveryStatus = 'SCHEDULED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';

export type DeliveryType = 'OWNER' | 'EMPLOYEE' | 'EXTERNAL_DRIVER';

export type DeliveryUser = {
  id: string;
  fullName?: string;
  name?: string;
  email?: string;
  active?: boolean;
  deliveryType?: DeliveryType;
};

export type DeliveryOrderItem = {
  id: string;
  productNameSnapshot: string;
  imageUrlSnapshot: string | null;
  variantNameSnapshot: string | null;
  skuSnapshot: string | null;
  quantity: number;
  supplyType: OrderSupplyType;
  status: OrderItemStatus;
};

export type DeliverySummary = {
  id: string;
  code: string;
  status: DeliveryStatus;
  scheduledDate: string;
  timeWindow: string | null;
  deliveryType: DeliveryType;
  address: string;
  contactName: string;
  contactPhone: string;
  externalDriverName: string | null;
  assignedUser: DeliveryUser | null;
  order: { id: string; code: string; status: OrderStatus };
  customer: { id: string; fullName: string; phone?: string | null };
  createdAt: string;
};

export type DeliveryDetail = Omit<DeliverySummary, 'order'> & {
  addressReference: string | null;
  fee: string | null;
  notes: string | null;
  receiverName: string | null;
  evidenceUrls: string[] | null;
  deliveredAt: string | null;
  createdByUser: DeliveryUser;
  updatedAt: string;
  order: {
    id: string;
    code: string;
    status: OrderStatus;
    promisedDate: string | null;
    notes: string | null;
  };
  items: DeliveryOrderItem[];
};

export type DeliveryPage = {
  data: DeliverySummary[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

export type DeliveryAssigneePage = {
  data: DeliveryUser[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

export const deliveryStatusLabel: Record<DeliveryStatus, string> = {
  SCHEDULED: 'Programada',
  OUT_FOR_DELIVERY: 'En camino',
  DELIVERED: 'Entregada',
  CANCELLED: 'Cancelada'
};

export const deliveryTypeLabel: Record<DeliveryType, string> = {
  OWNER: 'Propietario',
  EMPLOYEE: 'Empleado',
  EXTERNAL_DRIVER: 'Conductor externo'
};

export function deliveryAssigneeName(delivery: {
  assignedUser: DeliveryUser | null;
  externalDriverName: string | null;
}) {
  return (
    delivery.assignedUser?.fullName ??
    delivery.assignedUser?.name ??
    delivery.externalDriverName ??
    'Sin responsable'
  );
}

export const formatDeliveryDate = formatDate;

export const formatDeliveryDateTime = formatDateTime;

export const formatDeliveryFee = formatMoney;
