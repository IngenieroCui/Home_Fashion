import { InventoryList } from '@/components/inventory-list';
import { requireCatalogManage } from '@/lib/auth/catalog-access';
export const dynamic = 'force-dynamic';
export default async function InventoryPage() {
  await requireCatalogManage();
  return <InventoryList />;
}
