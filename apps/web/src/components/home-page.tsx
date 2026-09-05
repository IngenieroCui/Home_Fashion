import Link from 'next/link';
import { ProductGrid } from './product-grid';
import { ProductImage } from './product-image';
import { PageState } from './page-state';
import { RetryButton } from './retry-button';
import { getCategories, getProducts } from '@/lib/catalog';

export async function HomePage() {
  const [categoriesResult, productsResult] = await Promise.allSettled([
    getCategories(),
    getProducts({ page: 1 })
  ]);
  const categories = categoriesResult.status === 'fulfilled' ? categoriesResult.value : [];
  const products =
    productsResult.status === 'fulfilled' ? productsResult.value.data.slice(0, 3) : [];
  const featured = products.find((product) => product.images?.length);
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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((category, index) => (
                <Link
                  className="category-card"
                  href={`/catalogo?category=${encodeURIComponent(category.slug)}`}
                  key={category.id}
                >
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
            ) : products.length ? (
              <ProductGrid products={products} />
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
