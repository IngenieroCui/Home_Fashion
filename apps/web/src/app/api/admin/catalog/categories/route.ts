import { adminApi, adminJson } from '@/lib/admin-catalog';
import { NextRequest } from 'next/server';
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q');
  return adminJson(
    await adminApi(
      request,
      `/admin/catalog/categories${query ? `?q=${encodeURIComponent(query)}` : ''}`
    )
  );
}
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  return adminJson(
    await adminApi(request, '/admin/catalog/categories', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    })
  );
}
