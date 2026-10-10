export const LOW_STOCK_THRESHOLD = 2;
export type InventoryAlert = 'OUT_OF_STOCK' | 'LOW_STOCK' | 'AVAILABLE';
export type OperationCapabilities = {
  quotes: boolean;
  customers: boolean;
  sales: boolean;
  payments: boolean;
  orders: boolean;
  catalog: boolean;
  workshop: boolean;
  progressReview: boolean;
  deliveries: boolean;
};
export type Activity = {
  kind: 'QUOTE' | 'SALE' | 'PAYMENT' | 'ORDER' | 'WORKSHOP' | 'DELIVERY';
  id: string;
  code: string | null;
  title: string;
  subtitle?: string;
  status?: string;
  occurredAt: string;
  href: string;
};
