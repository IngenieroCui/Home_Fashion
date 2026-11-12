import { formatMoney } from './formatters';
export type SaleStatus = 'CONFIRMED' | 'CANCELLED';
export type PaymentStatus = 'PENDING' | 'PARTIALLY_PAID' | 'PAID';
export type PaymentType = 'DEPOSIT' | 'PAYMENT' | 'FINAL_PAYMENT' | 'REFUND' | 'ADJUSTMENT';
export type PaymentMethod =
  'CASH' | 'DEBIT_CARD' | 'CREDIT_CARD' | 'ADDI' | 'SISTECREDITO' | 'BANK_TRANSFER' | 'OTHER';
export type AdjustmentEffect = 'ADD_TO_PAID' | 'SUBTRACT_FROM_PAID';
export type PaymentRecordStatus = 'REGISTERED' | 'VOIDED';
export type Customer = {
  id: string;
  fullName: string;
  documentNumber?: string | null;
  phone?: string | null;
};
export type Variant = {
  id: string;
  sku: string;
  name: string | null;
  salePrice: string;
  quantityOnHand?: number;
  status?: string;
};
export type Product = {
  id: string;
  name: string;
  allowsCustomization: boolean;
  variants?: Variant[];
};
export type SaleItem = {
  id: string;
  productId: string;
  productVariantId: string | null;
  productNameSnapshot: string;
  imageUrlSnapshot: string | null;
  variantNameSnapshot: string | null;
  skuSnapshot: string | null;
  customization: Record<string, unknown> | null;
  quantity: number;
  unitListPrice: string | null;
  unitSalePrice: string;
  unitCostSnapshot?: string | null;
  discountAmount: string;
  subtotal: string;
  negotiationReason: string | null;
  belowCostReason: string | null;
  isBelowCost: boolean;
  notes: string | null;
  grossProfit?: string | null;
  margin?: number | null;
};
export type PaymentUser = { id: string; fullName: string; email?: string };
export type SalePayment = {
  id: string;
  type: PaymentType;
  method: PaymentMethod;
  adjustmentEffect: AdjustmentEffect | null;
  amount: string;
  paidAt: string;
  reference: string | null;
  notes: string | null;
  evidenceUrl: string | null;
  status: PaymentRecordStatus;
  createdBy?: PaymentUser | null;
  voidedBy?: PaymentUser | null;
  voidedAt: string | null;
  voidReason: string | null;
  createdAt?: string;
};
export type Sale = {
  id: string;
  code: string;
  customerId: string;
  quoteId: string | null;
  status: SaleStatus;
  subtotal: string;
  discountTotal: string;
  deliveryFee: string;
  total: string;
  amountPaid?: string | null;
  balance?: string | null;
  paymentStatus?: PaymentStatus | null;
  notes: string | null;
  createdAt: string;
  customer?: Customer;
  quote?: { id: string; code: string };
  createdByUser?: { id: string; fullName: string; email?: string };
  items?: SaleItem[];
  order?: { id: string; code: string; status: string } | null;
  payments?: SalePayment[];
  warnings?: string[];
  financialSummary?: { costStatus: string; grossProfit: string | null; margin: number | null };
};
export type Page<T> = {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};
export const money = formatMoney;
export const text = (value: FormDataEntryValue | null) => String(value ?? '').trim() || undefined;
export const number = (value: FormDataEntryValue | null) => {
  const valueText = text(value);
  if (!valueText) return undefined;
  const parsed = Number(valueText);
  return Number.isFinite(parsed) ? parsed : undefined;
};
export const paymentStatusLabel: Record<PaymentStatus, string> = {
  PENDING: 'Pendiente',
  PARTIALLY_PAID: 'Pago parcial',
  PAID: 'Pagada'
};
export const paymentTypeLabel: Record<PaymentType, string> = {
  DEPOSIT: 'Abono',
  PAYMENT: 'Pago',
  FINAL_PAYMENT: 'Pago final',
  REFUND: 'Devolución',
  ADJUSTMENT: 'Ajuste'
};
export const paymentMethodLabel: Record<PaymentMethod, string> = {
  CASH: 'Efectivo',
  DEBIT_CARD: 'Tarjeta débito',
  CREDIT_CARD: 'Tarjeta crédito',
  ADDI: 'Addi',
  SISTECREDITO: 'Sistecrédito',
  BANK_TRANSFER: 'Transferencia bancaria',
  OTHER: 'Otro'
};
