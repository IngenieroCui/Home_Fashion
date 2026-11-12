import { formatMoney } from './formatters';
export type Customer = {
  id: string;
  fullName: string;
  documentType: string | null;
  documentNumber: string | null;
  phone: string;
  email: string | null;
  city: string | null;
  neighborhood: string | null;
  address: string | null;
  notes: string | null;
  isActive: boolean;
  quotes?: QuoteSummary[];
  createdAt?: string;
  updatedAt?: string;
};
export type QuoteStatus =
  'REQUESTED' | 'DRAFT' | 'QUOTED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';
export type QuoteSummary = {
  id: string;
  code: string;
  status: QuoteStatus;
  validUntil?: string | null;
  deliveryFee?: string | null;
  subtotal?: string | null;
  discountTotal?: string | null;
  total: string | null;
  createdAt: string;
  customer?: Pick<Customer, 'id' | 'fullName' | 'phone'>;
};
export type QuoteItem = {
  id: string;
  productId: string;
  productVariantId: string | null;
  productNameSnapshot: string;
  imageUrlSnapshot: string | null;
  variantNameSnapshot: string | null;
  skuSnapshot: string | null;
  quantity: number;
  unitListPrice: string | null;
  unitQuotedPrice: string | null;
  discountAmount: string | null;
  subtotal: string | null;
  customization: Record<string, unknown> | null;
  negotiationReason: string | null;
  notes: string | null;
};
export type Quote = QuoteSummary & {
  customerId: string;
  validUntil: string | null;
  customerNotes: string | null;
  internalNotes: string | null;
  deliveryFee: string;
  subtotal: string | null;
  discountTotal: string | null;
  total: string | null;
  customer?: Customer;
  items?: QuoteItem[];
};
export type Page<T> = {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};
export type CatalogVariant = {
  id: string;
  sku: string;
  name: string | null;
  salePrice: string;
  status: 'ACTIVE' | 'INACTIVE';
};
export type CatalogProduct = {
  id: string;
  name: string;
  slug: string;
  allowsCustomization: boolean;
  variants?: CatalogVariant[];
};

export const quoteStatusLabel: Record<QuoteStatus, string> = {
  REQUESTED: 'Solicitada',
  DRAFT: 'Borrador',
  QUOTED: 'Cotizada',
  ACCEPTED: 'Aceptada',
  REJECTED: 'Rechazada',
  EXPIRED: 'Vencida',
  CANCELLED: 'Cancelada'
};
export const allowedQuoteStatuses: Partial<Record<QuoteStatus, QuoteStatus[]>> = {
  REQUESTED: ['DRAFT', 'QUOTED', 'CANCELLED'],
  DRAFT: ['QUOTED', 'CANCELLED'],
  QUOTED: ['ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED']
};

export function money(value: string | number | null | undefined) {
  return formatMoney(value, 'Pendiente de definir');
}

export function optionalNumber(value: FormDataEntryValue | null): number | undefined {
  if (value === null || String(value).trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function optionalText(value: FormDataEntryValue | null): string | undefined {
  const text = String(value ?? '').trim();
  return text || undefined;
}
