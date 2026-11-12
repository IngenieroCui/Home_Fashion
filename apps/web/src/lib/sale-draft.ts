import type { Product } from './sales';
export type SaleDraft = {
  productId: string;
  productVariantId?: string;
  quantity: number;
  unitSalePrice?: number;
  customization?: Record<string, string>;
  negotiationReason?: string;
  belowCostReason?: string;
  notes?: string;
  label: string;
  product: Product;
};
