import type { CatalogProduct, ProductImage as CatalogImage, ProductVariant } from './catalog';

export function availabilityLabel(variant?: ProductVariant) {
  const available = variant?.availability;
  if (available === 1) return 'Última unidad';
  if (available && available > 1) return `${available} unidades disponibles`;
  return 'Disponible bajo pedido';
}
export function variantImages(product: CatalogProduct, variant?: ProductVariant): CatalogImage[] {
  const order = (images: CatalogImage[] = []) => [...images].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.position - b.position);
  const seen = new Set<string>();
  return [...order(variant?.images), ...order(product.images)].filter((image) => { if (seen.has(image.url)) return false; seen.add(image.url); return true; });
}
