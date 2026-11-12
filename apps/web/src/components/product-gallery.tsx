'use client';
import { useRef, useState } from 'react';
import type { ProductImage as CatalogImage } from '@/lib/catalog';
import { isReferenceImage } from '@/lib/reference-image';
import { ProductImage } from './product-image';

export function ProductGallery({ images, name }: { images: CatalogImage[]; name: string }) {
  const [selected, setSelected] = useState(0);
  const start = useRef<{ x: number; y: number } | null>(null);
  const active = images[selected];
  const move = (direction: number) =>
    setSelected((index) =>
      images.length ? (index + direction + images.length) % images.length : 0
    );
  return (
    <div
      className="product-gallery"
      aria-label={`Fotografías de ${name}`}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault();
          move(event.key === 'ArrowLeft' ? -1 : 1);
        }
      }}
    >
      <div
        className="product-gallery-stage"
        style={{ touchAction: 'pan-y' }}
        onTouchStart={(event) => {
          const touch = event.touches[0];
          start.current = { x: touch.clientX, y: touch.clientY };
        }}
        onTouchEnd={(event) => {
          const touch = event.changedTouches[0];
          if (start.current) {
            const dx = touch.clientX - start.current.x;
            const dy = touch.clientY - start.current.y;
            if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? -1 : 1);
          }
          start.current = null;
        }}
      >
        <ProductImage
          key={active?.url ?? 'placeholder'}
          alt={name}
          className="detail-image"
          image={active}
          width={1200}
          widths={[600, 900, 1200, 1600]}
          sizes="(max-width: 1023px) 100vw, (max-width: 1919px) 50vw, 880px"
        />
        {images.length > 1 && (
          <div className="product-gallery-controls">
            <button aria-label="Fotografía anterior" onClick={() => move(-1)} type="button">
              ←
            </button>
            <span aria-live="polite">
              {selected + 1} / {images.length}
            </span>
            <button aria-label="Fotografía siguiente" onClick={() => move(1)} type="button">
              →
            </button>
          </div>
        )}
      </div>
      {images.length > 1 && (
        <div aria-label="Fotografías del producto" className="product-gallery-thumbs">
          {images.map((image, index) => (
            <button
              aria-label={`Ver fotografía ${index + 1}`}
              aria-pressed={selected === index}
              key={image.url}
              onKeyDown={(event) => {
                if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
                event.preventDefault();
                event.stopPropagation();
                const next =
                  (index + (event.key === 'ArrowLeft' ? -1 : 1) + images.length) % images.length;
                setSelected(next);
                event.currentTarget.parentElement
                  ?.querySelectorAll<HTMLButtonElement>('button')
                  [next]?.focus();
              }}
              onClick={() => setSelected(index)}
              type="button"
            >
              <ProductImage
                alt={image.altText || name}
                image={image}
                width={200}
                widths={[120, 200, 320]}
                sizes="100px"
              />
            </button>
          ))}
        </div>
      )}
      {isReferenceImage(images[0]) && (
        <p className="reference-image-note">
          Imagen de referencia. La opción final se confirma al cotizar.
        </p>
      )}
    </div>
  );
}
