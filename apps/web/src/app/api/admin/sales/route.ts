import { salesApi, salesJson } from '@/lib/admin-sales';
import { NextRequest } from 'next/server';
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.toString();
  return salesJson(await salesApi(request, `/admin/sales${query ? `?${query}` : ''}`));
}
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  return salesJson(
    await salesApi(request, '/admin/sales', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    })
  );
}
