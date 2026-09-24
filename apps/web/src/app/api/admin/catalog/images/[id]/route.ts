import { adminApi, adminJson } from '@/lib/admin-catalog';
import { NextRequest } from 'next/server';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  return adminJson(await adminApi(request, `/admin/catalog/images/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  }));
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return adminJson(await adminApi(request, `/admin/catalog/images/${encodeURIComponent(id)}`, { method: 'DELETE' }));
}
