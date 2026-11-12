import type { ReactNode } from 'react';
import { ProductImage } from './product-image';

export function CommerceItemVisual({ imageUrl, name, variant, quantity, meta }: {
  imageUrl?: string | null;
  name: string;
  variant?: string | null;
  quantity?: number;
  meta?: ReactNode;
}) {
  return <div className="commerce-item-visual" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
    <ProductImage image={imageUrl ? { url: imageUrl, altText: name } as Parameters<typeof ProductImage>[0]['image'] : undefined} alt={name} className="commerce-item-photo" />
    <div><strong>{name}</strong>{variant && <p>{variant}</p>}{quantity !== undefined && <small>Cantidad: {quantity}</small>}{meta}</div>
  </div>;
}
