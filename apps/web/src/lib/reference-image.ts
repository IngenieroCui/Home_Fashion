import type { ProductImage } from './catalog';
export function isReferenceImage(image: Pick<ProductImage, 'altText'> | null | undefined): boolean {
  return /^(referencia visual de|imagen ilustrativa)/i.test(image?.altText?.trim() ?? '');
}
