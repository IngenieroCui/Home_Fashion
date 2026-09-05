'use client';

import { useState } from 'react';
import type { ProductImage as ProductImageType } from '@/lib/catalog';

export function ProductImage({
  image,
  alt,
  className = ''
}: {
  image?: ProductImageType;
  alt: string;
  className?: string;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (!image?.url || failedUrl === image.url)
    return (
      <div
        role="img"
        aria-label={`Imagen no disponible de ${alt}`}
        className={`image-placeholder ${className}`}
      >
        Home Fashion
      </div>
    );
  // Remote API URLs are intentionally not whitelisted globally for Next Image.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={image.altText || alt}
      className={`product-image ${className}`}
      loading="lazy"
      decoding="async"
      onError={() => setFailedUrl(image.url)}
      src={image.url}
    />
  );
}
