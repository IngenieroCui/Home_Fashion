import type { Metadata } from 'next';
import { cache } from 'react';
import Link from 'next/link';
import { RetryButton } from '@/components/retry-button';
import { notFound } from 'next/navigation';
import { ProductConfigurator } from '@/components/product-configurator';
import { ProductGrid } from '@/components/product-grid';
import { CatalogApiError, getProduct, getProducts } from '@/lib/catalog';

export const dynamic = 'force-dynamic';
const loadProduct = cache(getProduct);
export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  try {
    const product = await loadProduct((await params).slug);
    const image = product.images?.find((image) => image.isPrimary) ?? product.images?.[0];
    const title = `${product.name} | Home Fashion`;
    return {
      title,
      description: product.description,
      openGraph: {
        title,
        description: product.description,
        ...(image ? { images: [{ url: image.url, alt: image.altText || product.name }] } : {})
      }
    };
  } catch {
    return { title: 'Producto | Home Fashion' };
  }
}

export default async function ProductPage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ variant?: string }>;
}) {
  const { slug } = await params;
  let product;
  try {
    product = await loadProduct(slug);
  } catch (error) {
    if (error instanceof CatalogApiError && error.status === 404) notFound();
    return (
      <main className="page-shell py-16">
        <Link
          className="text-sm font-semibold text-[var(--color-primary)] underline"
          href="/catalogo"
        >
          ← Volver al catálogo
        </Link>
        <section className="notice mt-8">
          <h1 className="font-serif text-3xl">No pudimos cargar este producto</h1>
          <p>Inténtalo nuevamente en unos minutos.</p>
          <div className="mt-4">
            <RetryButton />
          </div>
        </section>
      </main>
    );
  }
  const { variant } = await searchParams;
  const related = product.category?.slug
    ? await getProducts({ category: product.category.slug })
        .then((page) => page.data.filter((item) => item.id !== product.id).slice(0, 4))
        .catch(() => [])
    : [];
  return (
    <main className="page-shell py-10">
      <Link
        className="text-sm font-semibold text-[var(--color-primary)] underline underline-offset-4"
        href="/catalogo"
      >
        ← Volver al catálogo
      </Link>
      <ProductConfigurator key={product.id} product={product} initialVariantId={variant} />
      {related.length > 0 && (
        <section className="related-products" aria-labelledby="related-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Sigue explorando</p>
              <h2 className="font-serif text-4xl" id="related-title">
                También para tu espacio
              </h2>
            </div>
            <Link className="text-link" href={`/catalogo?category=${product.category?.slug}`}>
              Ver categoría →
            </Link>
          </div>
          <ProductGrid products={related} />
        </section>
      )}
    </main>
  );
}
