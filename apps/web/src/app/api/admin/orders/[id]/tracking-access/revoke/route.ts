import { ordersApi, ordersJson } from '@/lib/admin-orders';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return ordersJson(
    await ordersApi(request, `/admin/orders/${encodeURIComponent(id)}/tracking-access/revoke`, {
      method: 'POST'
    })
  );
}
