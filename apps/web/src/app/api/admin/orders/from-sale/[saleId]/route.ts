import { ordersApi, ordersJson } from '@/lib/admin-orders';
import { NextRequest } from 'next/server';
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ saleId: string }> }
) {
  const { saleId } = await params;
  const body = await request.json().catch(() => null);
  return ordersJson(
    await ordersApi(request, `/admin/orders/from-sale/${encodeURIComponent(saleId)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    })
  );
}
