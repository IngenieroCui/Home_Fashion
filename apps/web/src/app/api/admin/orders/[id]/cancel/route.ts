import { ordersApi, ordersJson } from '@/lib/admin-orders';
import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return ordersJson(await ordersApi(request, '/admin/orders/' + encodeURIComponent(id) + '/cancel', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(await request.json().catch(() => null))
  }));
}
