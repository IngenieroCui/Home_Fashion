import Link from 'next/link';
import { hasAvailability, productPrice, type CatalogProduct } from '@/lib/catalog';
import { ProductImage } from './product-image';

export function ProductCard({ product }: { product: CatalogProduct }) {
  const availability = hasAvailability(product);
  return (
    <article className="product-card">
      <div className="relative">
        <ProductImage alt={product.name} image={product.images?.[0]} />
        {product.images?.[0]?.altText?.startsWith('Imagen ilustrativa') && (
          <span className="reference-image-badge">Imagen de referencia</span>
        )}
      </div>
      <div className="space-y-3 p-5">
        <p className="eyebrow">{product.category?.name ?? 'Colección Home Fashion'}</p>
        <h2 className="font-serif text-2xl text-[#3d291e]">
          <Link className="focus-link" href={`/catalogo/${product.slug}`}>
            {product.name}
          </Link>
        </h2>
        <p className="line-clamp-2 text-sm text-[#67574d]">{product.description}</p>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <strong className="text-[#3d291e]">
            {productPrice(product) ?? 'Precio por confirmar'}
          </strong>
          {product.allowsCustomization && <span className="tag">Personalizable</span>}
          {availability !== undefined && (
            <span
              className={
                availability ? 'availability availability-in' : 'availability availability-out'
              }
            >
              {availability
                ? 'Disponible'
                : product.allowsCustomization
                  ? 'Bajo pedido'
                  : 'Sin disponibilidad'}
            </span>
          )}
        </div>
        <Link
          className="text-sm font-semibold text-[#a64b32] underline underline-offset-4"
          href={`/catalogo/${product.slug}`}
        >
          Ver producto
        </Link>
      </div>
    </article>
  );
}
