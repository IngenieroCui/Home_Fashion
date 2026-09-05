import type { CatalogProduct } from '@/lib/catalog';
import { ProductCard } from './product-card';

export function ProductGrid({ products }: { products: CatalogProduct[] }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
