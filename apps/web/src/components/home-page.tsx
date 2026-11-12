import Link from 'next/link';
import { ProductGrid } from './product-grid';
import { ProductImage } from './product-image';
import { PageState } from './page-state';
import { RetryButton } from './retry-button';
import { getCategories, getProducts } from '@/lib/catalog';

export async function HomePage() {
  const [categoriesResult, productsResult, availableResult, customizableResult] =
    await Promise.allSettled([
      getCategories(),
      getProducts({ page: 1, limit: 50, sort: 'newest' }),
      getProducts({ limit: 4, inStock: true }),
      getProducts({ limit: 4, allowsCustomization: true })
    ]);
  const categories = categoriesResult.status === 'fulfilled' ? categoriesResult.value : [];
  const products = productsResult.status === 'fulfilled' ? productsResult.value.data : [];
  const featuredProducts = [
    ...products.filter((product) => product.images?.length),
    ...products.filter((product) => !product.images?.length)
  ].slice(0, 6);
  const featured =
    products.find((product) => product.category?.slug === 'sofas' && product.images?.length) ??
    products.find((product) => product.images?.length);
  return (
    <main>
      <section className="hero">
        <div className="page-shell home-hero-grid">
          <div className="home-hero-copy">
            <p className="eyebrow">De nuestra familia a tu hogar · Ibagué</p>
            <h1 className="font-serif">
              Tu hogar,
              <br />a tu <em>manera.</em>
            </h1>
            <p className="home-hero-description">
              Muebles que se adaptan a tu vida. Encuentra tu próxima pieza favorita o cuéntanos cómo
              la imaginas.
            </p>
            <div className="admin-actions">
              <Link className="button-link" href="/catalogo">
                Descubrir el catálogo <span aria-hidden="true">↗</span>
              </Link>
              <Link
                className="button-link button-link-secondary"
                href="/catalogo?allowsCustomization=true"
              >
                Quiero personalizar
              </Link>
            </div>
            <p className="home-hero-note">
              Elige con calma. Solicita una cotización sin compromiso.
            </p>
          </div>
          {featured ? (
            <Link className="home-featured" href={`/catalogo/${featured.slug}`}>
              <ProductImage
                image={featured.images?.find((image) => image.isPrimary) ?? featured.images?.[0]}
                alt={featured.name}
                width={1100}
                widths={[750, 1100, 1500, 1800]}
                sizes="(max-width: 1023px) 100vw, (max-width: 1919px) 50vw, 880px"
                loading="eager"
                fetchPriority="high"
              />
              <div>
                <p className="eyebrow">Encuentra inspiración</p>
                <h2 className="font-serif text-3xl">{featured.name}</h2>
                <span className="text-link">Conocer este mueble ↗</span>
              </div>
            </Link>
          ) : (
            <div className="home-editorial">
              <span className="editorial-arch" aria-hidden="true" />
              <span className="editorial-number" aria-hidden="true">
                hf.
              </span>
              <div>
                <p className="editorial-kicker">Cada espacio cuenta una historia</p>
                <p className="font-serif">
                  Hagamos lugar
                  <br />
                  para la tuya.
                </p>
                <span className="editorial-rule" />
                <span>Muebles · Detalles · Vida en casa</span>
              </div>
            </div>
          )}
        </div>
      </section>
      <div className="home-promise-bar">
        <div className="page-shell">
          <span>Opciones listas para entrega</span>
          <span>Fabricación bajo pedido</span>
          <span>Detalles a tu medida</span>
        </div>
      </div>
      <section className="page-shell py-16">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Un lugar para cada idea</p>
            <h2 className="font-serif text-4xl">Encuentra tu espacio</h2>
          </div>
          <Link className="text-link" href="/catalogo">
            Ver todo ↗
          </Link>
        </div>
        <div className="mt-8">
          {categories.length ? (
            <div className="home-category-grid">
              {categories.map((category, index) => (
                <Link
                  className="category-card"
                  href={`/catalogo?category=${encodeURIComponent(category.slug)}`}
                  key={category.id}
                >
                  <div className="category-visual">
                    <ProductImage
                      alt={`Colección ${category.name}`}
                      image={
                        products.find(
                          (product) =>
                            product.category?.slug === category.slug && product.images?.length
                        )?.images?.[0]
                      }
                    />
                  </div>
                  <span className="category-index" aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <h3 className="font-serif text-2xl">{category.name}</h3>
                  <p>
                    {category.description ||
                      'Descubre opciones para darle tu estilo a este espacio.'}
                  </p>
                  <span className="category-arrow" aria-hidden="true">
                    ↗
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <PageState
              title={
                categoriesResult.status === 'rejected'
                  ? 'No pudimos consultar las categorías'
                  : 'Nuevos espacios por descubrir'
              }
              action={
                categoriesResult.status === 'rejected' ? (
                  <RetryButton />
                ) : (
                  <Link href="/catalogo" className="button-link button-link-secondary">
                    Ir al catálogo
                  </Link>
                )
              }
            >
              <p>
                {categoriesResult.status === 'rejected'
                  ? 'La conexión no está disponible en este momento. Puedes intentarlo nuevamente.'
                  : 'Aún no hay categorías publicadas. Pronto podrás explorar nuestra colección.'}
              </p>
            </PageState>
          )}
        </div>
      </section>
      {[
        { title: 'Disponibles ahora', result: availableResult, href: '/catalogo?inStock=true' },
        {
          title: 'Personalizables',
          result: customizableResult,
          href: '/catalogo?allowsCustomization=true'
        }
      ].map(({ title, result, href }) =>
        result.status === 'fulfilled' && result.value.data.length > 0 ? (
          <section className="page-shell py-12" key={title}>
            <div className="section-heading">
              <h2 className="font-serif text-4xl">{title}</h2>
              <Link className="text-link" href={href}>
                Ver colección →
              </Link>
            </div>
            <div className="mt-8">
              <ProductGrid products={result.value.data.slice(0, 4)} />
            </div>
          </section>
        ) : null
      )}
      <section className="home-customization">
        <div className="page-shell home-customization-grid">
          <div>
            <p className="eyebrow">A tu medida</p>
            <h2 className="font-serif text-4xl">Una pieza que conversa con tu hogar</h2>
            <p>
              Elige una referencia y cuéntanos qué necesitas. Podemos revisar contigo telas,
              colores, acabados y medidas cuando el diseño permita personalización.
            </p>
            <Link className="button-link" href="/catalogo?allowsCustomization=true">
              Explorar personalizables →
            </Link>
          </div>
          <div className="home-customization-note">
            <span>01 / 03</span>
            <strong className="font-serif">Tu espacio inspira cada detalle.</strong>
            <p>La propuesta final y la disponibilidad se confirman al cotizar.</p>
          </div>
        </div>
      </section>
      <section className="home-collection">
        <div className="page-shell py-16">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Selección Home Fashion</p>
              <h2 className="font-serif text-4xl">Hechos para disfrutar</h2>
            </div>
            <Link className="text-link" href="/catalogo">
              Explorar muebles ↗
            </Link>
          </div>
          <div className="mt-8">
            {productsResult.status === 'rejected' ? (
              <PageState
                title="No pudimos cargar los muebles"
                tone="error"
                action={<RetryButton />}
              >
                <p>
                  La conexión con el catálogo no está disponible. Inténtalo nuevamente en un
                  momento.
                </p>
              </PageState>
            ) : featuredProducts.length ? (
              <ProductGrid products={featuredProducts} />
            ) : (
              <PageState title="Lo próximo para tu hogar está por llegar">
                <p>Aún no hay muebles publicados. Vuelve pronto para descubrir las novedades.</p>
              </PageState>
            )}
          </div>
        </div>
      </section>
      <section className="page-shell py-16">
        <p className="eyebrow">Te acompañamos en cada paso</p>
        <h2 className="font-serif text-4xl">De una idea a tu hogar</h2>
        <div className="home-steps">
          <article className="benefit">
            <span className="category-index">01</span>
            <h3 className="font-serif text-2xl">Encuentra tu mueble</h3>
            <p>Explora los diseños y elige las opciones que van contigo.</p>
          </article>
          <article className="benefit">
            <span className="category-index">02</span>
            <h3 className="font-serif text-2xl">Cuéntanos los detalles</h3>
            <p>Solicita una cotización. Nuestro equipo te ayudará a definir tu pedido.</p>
          </article>
          <article className="benefit">
            <span className="category-index">03</span>
            <h3 className="font-serif text-2xl">Acompaña su recorrido</h3>
            <p>Con el enlace privado de tu pedido podrás consultar los avances hasta la entrega.</p>
          </article>
        </div>
      </section>
    </main>
  );
}
