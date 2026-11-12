'use client';
import { useActionFeedback } from '../ui/action-feedback';
import { LoadingState } from '../ui/loading-state';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ListError } from '../page-state';
import { api, ErrorMessage, type Category, type Product, type Page } from './catalog-shared';
import { ProductCreateForm, ProductEditForm } from './product-form';
import { ProductImages } from './product-images-panel';
import type { VariantFinancialAccess } from './variant-form';
import { VariantList } from './variant-list';

export function NewProductPage() {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api<Page<Category>>('/api/admin/catalog/categories?limit=50')
      .then((result) => setCategories(result.data))
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : 'No fue posible cargar las categorías.')
      );
  }, []);
  if (error) return <ErrorMessage message={error} />;
  if (!categories) return <LoadingState label="Cargando categorías" />;
  return <ProductCreateForm categories={categories} />;
}

export function ProductEditor({ id, created, financialAccess }: { id: string; created: boolean; financialAccess: VariantFinancialAccess }) {
  const notify = useActionFeedback();
  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState(
    created ? 'Producto creado. Agrega una variante antes de activarlo.' : ''
  );
  const reload = () => {
    setError(null);
    setProduct(null);
    Promise.all([
      api<Product>(`/api/admin/catalog/products/${id}`),
      api<Page<Category>>('/api/admin/catalog/categories?limit=50')
    ])
      .then(([item, categoryResult]) => {
        setProduct(item);
        setCategories(categoryResult.data);
      })
      .catch((reason) =>
        setError(reason instanceof Error ? reason.message : 'No fue posible cargar el producto.')
      );
  };
  useEffect(reload, [id]);
  if (error) return <ListError message={error} retry={reload} />;
  if (!product) return <LoadingState label="Cargando producto" />;
  return (
    <div className="admin-stack">
      <section className="admin-heading">
        <div>
          <Link className="text-link" href="/panel/catalogo">
            ← Catálogo
          </Link>
          <h1 className="font-serif text-4xl">{product.name}</h1>
          <p>Edición de producto y variantes.</p>
        </div>
        {product.status === 'ACTIVE' ? (
          <Link className="button-link button-link-secondary" href={`/catalogo/${product.slug}`}>
            Ver catálogo público
          </Link>
        ) : null}
      </section>
      {notice ? (
        <p className="admin-success" role="status">
          {notice}
        </p>
      ) : null}
      <ProductEditForm
        categories={categories}
        onSaved={(message) => {
          notify(message);
          setNotice(message);
          reload();
        }}
        product={product}
      />
      <section className="admin-section">
        <h2 className="font-serif text-2xl">Variantes</h2>
        <p>Disponibilidad: existencias menos reservas.</p>
        <VariantList
          financialAccess={financialAccess}
          onSaved={(message) => {
            notify(message);
            setNotice(message);
            reload();
          }}
          product={product}
        />
      </section>
      <section className="admin-section">
        <h2 className="font-serif text-2xl">Imágenes</h2>
        <ProductImages
          product={product}
          onSaved={(message) => {
            notify(message);
            setNotice(message);
            reload();
          }}
        />
      </section>
    </div>
  );
}
