'use client';

import { useState } from 'react';
import { cloudinaryImageUrl, cloudinarySrcSet } from '@/lib/cloudinary';
import type { ProductImage as ProductImageType } from '@/lib/catalog';

export function ProductImage({
  image,
  alt,
  className = '',
  width = 750,
  widths = [360, 540, 750, 900],
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1439px) 33vw, 25vw',
  loading = 'lazy',
  fetchPriority = 'auto'
}: {
  image?: ProductImageType;
  alt: string;
  className?: string;
  width?: number;
  widths?: readonly number[];
  sizes?: string;
  loading?: 'lazy' | 'eager';
  fetchPriority?: 'auto' | 'high' | 'low';
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (!image?.url || failedUrl === image.url)
    return (
      <div
        role="img"
        aria-label={`Imagen no disponible de ${alt}`}
        className={`image-placeholder ${className}`}
      >
        <span className="placeholder-mark" aria-hidden="true">
          hf.
        </span>
        <span className="placeholder-caption">{alt}</span>
      </div>
    );
  // Remote API URLs are intentionally not whitelisted globally for Next Image.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={image.altText || alt}
      className={`product-image ${className}`}
      loading={loading}
      fetchPriority={fetchPriority}
      srcSet={cloudinarySrcSet(image.url, widths)}
      sizes={cloudinarySrcSet(image.url, widths) ? sizes : undefined}
      decoding="async"
      onError={() => setFailedUrl(image.url)}
      src={cloudinaryImageUrl(image.url, { width })}
    />
  );
}
