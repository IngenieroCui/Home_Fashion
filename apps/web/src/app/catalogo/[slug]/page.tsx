import Link from 'next/link';
import { RetryButton } from '@/components/retry-button';
import { notFound } from 'next/navigation';
import { ProductImage } from '@/components/product-image';
import { PublicQuoteRequestForm } from '@/components/public-quote-request-form';
import { CatalogApiError, formatPrice, getProduct } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let product;
  try {
    product = await getProduct(slug);
  } catch (error) {
    if (error instanceof CatalogApiError && error.status === 404) notFound();
    return (
      <main className="page-shell py-16">
        <Link className="text-sm font-semibold text-[#a64b32] underline" href="/catalogo">
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
  const variants = product.variants?.filter((variant) => variant.status === 'ACTIVE') ?? [];
  const canRequest = variants.length > 0 || product.allowsCustomization;
  return (
    <main className="page-shell py-10">
      <Link
        className="text-sm font-semibold text-[#a64b32] underline underline-offset-4"
        href="/catalogo"
      >
        ← Volver al catálogo
      </Link>
      <div className="mt-8 grid gap-10 lg:grid-cols-2">
        <div className="space-y-4">
          <ProductImage alt={product.name} className="detail-image" image={product.images?.[0]} />
          {product.images && product.images.length > 1 && (
            <div className="grid grid-cols-3 gap-3">
              {product.images.slice(1).map((image) => (
                <ProductImage alt={product.name} image={image} key={image.id} />
              ))}
            </div>
          )}
        </div>
        <section>
          <p className="eyebrow">{product.category?.name}</p>
          <h1 className="mt-2 font-serif text-5xl text-[#3d291e]">{product.name}</h1>
          <p className="mt-5 leading-7 text-[#67574d]">{product.description}</p>
          {product.allowsCustomization && (
            <p className="mt-5 inline-block rounded-full bg-[#dbe0c8] px-4 py-2 text-sm font-semibold text-[#4b592d]">
              Este diseño puede personalizarse
            </p>
          )}
          {canRequest && (
            <div className="mt-8 rounded-2xl bg-[#efe4d2] p-6">
              <h2 className="font-serif text-2xl text-[#3d291e]">¿Te interesa este diseño?</h2>
              <p className="mt-2 text-[#67574d]">
                Envíanos tus datos y te ayudaremos a elegir la mejor opción.
              </p>
              <a className="button-link mt-5" href="#solicitar-cotizacion">
                Solicitar cotización
              </a>
            </div>
          )}
        </section>
      </div>
      <section className="mt-14">
        <h2 className="font-serif text-4xl text-[#3d291e]">Variantes disponibles</h2>
        <div className="mt-6 grid gap-4">
          {variants.length ? (
            variants.map((variant) => (
              <article className="variant-card" key={variant.id}>
                <div>
                  <h3 className="font-serif text-2xl text-[#3d291e]">
                    {variant.name || variant.sku}
                  </h3>
                  <p className="mt-1 text-sm text-[#67574d]">SKU: {variant.sku}</p>
                  <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                    {[
                      ['Medidas', variant.dimensions],
                      ['Material', variant.material],
                      ['Color', variant.color],
                      ['Tela', variant.fabric],
                      ['Acabado', variant.finish]
                    ]
                      .filter(([, detail]) => detail)
                      .map(([label, detail]) => (
                        <div key={label}>
                          <dt className="font-semibold text-[#3d291e]">{label}</dt>
                          <dd>{detail}</dd>
                        </div>
                      ))}
                  </dl>
                </div>
                <div className="sm:text-right">
                  <strong className="text-xl text-[#3d291e]">
                    {formatPrice(variant.salePrice)}
                  </strong>
                  <p
                    className={
                      variant.availability && variant.availability > 0
                        ? 'availability availability-in mt-3'
                        : 'availability availability-out mt-3'
                    }
                  >
                    {variant.availability && variant.availability > 0
                      ? `${variant.availability} disponible${variant.availability === 1 ? '' : 's'}`
                      : 'Disponible bajo pedido'}
                  </p>
                </div>
              </article>
            ))
          ) : (
            <p className="notice">Este producto no tiene variantes disponibles actualmente.</p>
          )}
        </div>
      </section>
      <PublicQuoteRequestForm
        allowsCustomization={product.allowsCustomization}
        productId={product.id}
        productName={product.name}
        variants={variants}
      />
    </main>
  );
}
