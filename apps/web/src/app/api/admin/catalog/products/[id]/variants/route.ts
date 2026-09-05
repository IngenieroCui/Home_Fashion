import { adminApi, adminJson } from '@/lib/admin-catalog';
import { NextRequest } from 'next/server';
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  return adminJson(
    await adminApi(request, `/admin/catalog/products/${encodeURIComponent(id)}/variants`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    })
  );
}
