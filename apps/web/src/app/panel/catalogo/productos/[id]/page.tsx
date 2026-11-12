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
  const { permissions } = await requireCatalogManage();
  const { id } = await params;
  const { created } = await searchParams;
  return <ProductEditor created={created === '1'} id={id} financialAccess={{
    price: permissions.includes('CATALOG_PRICE_EDIT'),
    cost: permissions.includes('FINANCIAL_COST_EDIT') && permissions.includes('FINANCIAL_COST_VIEW')
  }} />;
}
