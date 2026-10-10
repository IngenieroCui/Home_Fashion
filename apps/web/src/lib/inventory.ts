import type { Page } from './customer-quote-utils';
export type InventoryRow = {
  variantId: string;
  productId: string;
  productName: string;
  productSlug: string;
  category: { id: string; name: string };
  sku: string;
  variantName: string | null;
  imageUrl: string | null;
  salePrice: string;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  location: string | null;
  productStatus: string;
  variantStatus: string;
  alert: 'OUT_OF_STOCK' | 'LOW_STOCK' | 'AVAILABLE';
};
export type InventoryPage = Page<InventoryRow> & {
  summary: {
    activeVariants: number;
    onHandUnits: number;
    reservedUnits: number;
    availableUnits: number;
    lowStockVariants: number;
    outOfStockVariants: number;
  };
};
export const inventoryAlertLabel = {
  OUT_OF_STOCK: 'Sin stock',
  LOW_STOCK: 'Stock bajo',
  AVAILABLE: 'Disponible'
};
