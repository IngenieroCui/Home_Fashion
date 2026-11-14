import Link from 'next/link';
import { isReferenceImage } from '@/lib/reference-image';
import { hasAvailability, productPrice, type CatalogProduct } from '@/lib/catalog';
import { ProductImage } from './product-image';

export function ProductCard({ product }: { product: CatalogProduct }) {
  const availability = hasAvailability(product);
  const primary = product.images?.find((image) => image.isPrimary) ?? product.images?.[0];
  return (
    <article className="product-card">
      <div className="relative">
        <ProductImage alt={product.name} image={primary} />
        {isReferenceImage(primary) && (
          <span className="reference-image-badge">Imagen de referencia</span>
        )}
      </div>
      <div className="space-y-3 p-5">
        <p className="eyebrow">{product.category?.name ?? 'Colección Home Fashion'}</p>
        <h2 className="font-serif text-2xl text-[var(--color-text)]">
          <Link className="focus-link" href={`/catalogo/${product.slug}`}>
            {product.name}
          </Link>
        </h2>
        <p className="line-clamp-2 text-sm text-[var(--color-text-muted)]">{product.description}</p>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <strong className="text-[var(--color-text)]">
            {productPrice(product) ?? 'Precio por definir'}
          </strong>
          {product.allowsCustomization && <span className="tag">Personalizable</span>}
          {availability !== undefined && (
            <span
              className={
                availability ? 'availability availability-in' : 'availability availability-out'
              }
            >
              {availability ? 'Disponible' : 'Disponible bajo pedido'}
            </span>
          )}
        </div>
        <Link
          className="text-sm font-semibold text-[var(--color-primary-text)] underline underline-offset-4"
          href={`/catalogo/${product.slug}`}
        >
          Ver producto
        </Link>
      </div>
    </article>
  );
}
