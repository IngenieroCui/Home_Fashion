import { ProductEditor } from '@/components/admin-catalog';
import { requireCatalogManage } from '@/lib/auth/catalog-access';
export const dynamic = 'force-dynamic';
export default async function ProductAdminPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  await requireCatalogManage();
  const { id } = await params;
  const { created } = await searchParams;
  return <ProductEditor created={created === '1'} id={id} />;
}
