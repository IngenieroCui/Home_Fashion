import type { Customer, QuoteSummary } from './customer-quote-utils';
import type { PaymentStatus } from './sales';
import type { OrderStatus, OrderSupplyType } from './orders';
import type { DeliveryStatus } from './deliveries';
export type AttentionItem = {
  id: string;
  code: string;
  customerName?: string;
  createdAt: string;
  scheduledDate?: string;
};
export type Activity = {
  kind: string;
  id: string;
  code: string | null;
  title: string;
  subtitle?: string;
  status?: string;
  occurredAt: string;
  href: string;
};
export type Overview = {
  generatedAt: string;
  capabilities: Record<
    | 'quotes'
    | 'customers'
    | 'sales'
    | 'payments'
    | 'orders'
    | 'catalog'
    | 'workshop'
    | 'progressReview'
    | 'deliveries',
    boolean
  >;
  attention: Partial<
    Record<
      'requestedQuotes' | 'openOrders' | 'readyForReview' | 'scheduledDeliveries',
      { count: number; items: AttentionItem[] }
    >
  >;
  financial?: {
    confirmedSales: number;
    pendingPaymentSales: number;
    partiallyPaidSales: number;
    paidSales: number;
    outstandingBalance: string;
  };
  inventory?: {
    totalActiveVariants: number;
    availableUnits: number;
    reservedUnits: number;
    outOfStockVariants: number;
    lowStockVariants: number;
  };
  production?: { assigned: number; inProgress: number; readyForReview: number; completed: number };
  orders?: { open: number; inProgress: number; ready: number };
  deliveries?: { scheduled: number; outForDelivery: number };
  recentActivity: Activity[];
};
export type Customer360 = {
  customer: Customer & { createdAt: string; updatedAt: string };
  capabilities: Record<'quotes' | 'sales' | 'orders' | 'deliveries', boolean>;
  summary: {
    quoteCount?: number;
    activeQuoteCount?: number;
    saleCount?: number;
    outstandingBalance?: string;
    orderCount?: number;
    activeOrderCount?: number;
    lastActivityAt: string | null;
  };
  quotes?: QuoteSummary[];
  sales?: {
    id: string;
    code: string;
    createdAt: string;
    status: string;
    total: string;
    amountPaid: string;
    balance: string;
    paymentStatus: PaymentStatus;
  }[];
  orders?: {
    id: string;
    code: string;
    status: OrderStatus;
    promisedDate: string | null;
    createdAt: string;
    imageUrlSnapshot: string | null;
  }[];
  deliveries?: {
    id: string;
    code: string;
    status: DeliveryStatus;
    scheduledDate: string;
    deliveredAt: string | null;
  }[];
};
export type OrderPreparation = {
  sale: { id: string; code: string; createdAt: string; customer: { id: string; fullName: string } };
  items: {
    saleItemId: string;
    productId: string;
    productVariantId: string | null;
    productNameSnapshot: string;
    variantNameSnapshot: string | null;
    imageUrlSnapshot: string | null;
    skuSnapshot: string | null;
    quantity: number;
    customization: Record<string, unknown> | null;
    notes: string | null;
    inventory: {
      quantityOnHand: number;
      quantityReserved: number;
      quantityAvailable: number;
      location: string | null;
      variantStatus: string;
    } | null;
    suggestedSupplyType: OrderSupplyType;
  }[];
};
