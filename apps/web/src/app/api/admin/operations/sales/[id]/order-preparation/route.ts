import { NextRequest } from 'next/server';
import { ordersApi, ordersJson } from '@/lib/admin-orders';
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return ordersJson(
    await ordersApi(request, `/admin/operations/sales/${encodeURIComponent(id)}/order-preparation`)
  );
}
