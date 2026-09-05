import { CatalogDashboard } from '@/components/admin-catalog';
import { requireCatalogManage } from '@/lib/auth/catalog-access';
export const dynamic = 'force-dynamic';
export default async function CatalogPage() {
  await requireCatalogManage();
  return <CatalogDashboard />;
}
