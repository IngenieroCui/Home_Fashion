import { ordersApi, ordersJson } from '@/lib/admin-orders';
import { NextRequest } from 'next/server';
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return ordersJson(await ordersApi(request, `/admin/orders/${encodeURIComponent(id)}`));
}
