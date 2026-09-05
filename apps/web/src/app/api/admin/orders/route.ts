import { ordersApi, ordersJson } from '@/lib/admin-orders';
import { NextRequest } from 'next/server';
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.toString();
  return ordersJson(await ordersApi(request, `/admin/orders${query ? `?${query}` : ''}`));
}
