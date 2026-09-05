import { ordersApi, ordersJson } from '@/lib/admin-orders';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return ordersJson(
    await ordersApi(request, `/admin/orders/${encodeURIComponent(id)}/tracking-access`)
  );
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  return ordersJson(
    await ordersApi(request, `/admin/orders/${encodeURIComponent(id)}/tracking-access`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    })
  );
}
