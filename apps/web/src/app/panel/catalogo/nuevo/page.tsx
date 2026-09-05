import Link from 'next/link';
import { NewProductPage } from '@/components/admin-catalog';
import { requireCatalogManage } from '@/lib/auth/catalog-access';
export const dynamic = 'force-dynamic';
export default async function NewCatalogProductPage() {
  await requireCatalogManage();
  return (
    <div className="admin-stack">
      <section className="admin-heading">
        <div>
          <Link className="text-link" href="/panel/catalogo">
            ← Catálogo
          </Link>
          <p className="eyebrow">Catálogo</p>
          <h1 className="font-serif text-4xl">Nuevo producto</h1>
        </div>
      </section>
      <NewProductPage />
    </div>
  );
}
