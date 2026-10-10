'use client';
import { LoadingState as AdminSkeleton } from './ui/loading-state';
import Link from 'next/link';
import type { OrderPreparation } from '@/lib/operations';
import { useOperationData } from '@/lib/use-operation-data';
import { CreateOrderForm } from './create-order-form';
import { ListError } from './page-state';
export function CreateOrderPage({ id }: { id: string }) {
  const { data, error, retry } = useOperationData<OrderPreparation>(
    `/api/admin/operations/sales/${encodeURIComponent(id)}/order-preparation`
  );
  if (error) return <ListError message={error} retry={retry} />;
  if (!data) return <AdminSkeleton label="Consultando disponibilidad de los muebles" />;
  return (
    <div className="admin-stack">
      <Link className="text-link" href="/panel/pedidos">
        ← Pedidos
      </Link>
      <CreateOrderForm preparation={data} />
    </div>
  );
}
