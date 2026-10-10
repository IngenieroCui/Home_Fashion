import type { Customer } from './sales';
import type { WorkshopJobSummary } from './workshop-jobs';

export type OrderStatus = 'OPEN' | 'IN_PROGRESS' | 'READY' | 'COMPLETED' | 'CANCELLED';
export type OrderSupplyType = 'IN_STOCK' | 'MADE_TO_ORDER';
export type OrderItemStatus =
  'RESERVED' | 'PENDING_PRODUCTION' | 'IN_PRODUCTION' | 'READY' | 'DELIVERED' | 'CANCELLED';
export type OrderItem = {
  id: string;
  saleItemId: string;
  productId: string;
  productVariantId: string | null;
  productNameSnapshot: string;
  imageUrlSnapshot: string | null;
  variantNameSnapshot: string | null;
  skuSnapshot: string | null;
  customization: Record<string, unknown> | null;
  quantity: number;
  supplyType: OrderSupplyType;
  status: OrderItemStatus;
  notes: string | null;
  productVariant?: { id: string; quantityOnHand: number; quantityReserved: number } | null;
  workshopJob?: WorkshopJobSummary | null;
};
export type Order = {
  id: string;
  code: string;
  saleId: string;
  customerId: string;
  status: OrderStatus;
  promisedDate: string | null;
  notes: string | null;
  totalItems?: number;
  createdAt: string;
  sale?: { id: string; code: string; status?: string };
  customer?: Customer;
  createdByUser?: { id: string; fullName: string; email?: string };
  items?: OrderItem[];
};
export type OrderPage = {
  data: Order[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};
export const orderStatusLabel: Record<OrderStatus, string> = {
  OPEN: 'Abierto',
  IN_PROGRESS: 'En proceso',
  READY: 'Listo',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado'
};
export const supplyTypeLabel: Record<OrderSupplyType, string> = {
  IN_STOCK: 'Disponible en inventario',
  MADE_TO_ORDER: 'Fabricación bajo pedido'
};
export const orderItemStatusLabel: Record<OrderItemStatus, string> = {
  RESERVED: 'Reservado',
  PENDING_PRODUCTION: 'Pendiente de fabricación',
  IN_PRODUCTION: 'En fabricación',
  READY: 'Listo',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado'
};
