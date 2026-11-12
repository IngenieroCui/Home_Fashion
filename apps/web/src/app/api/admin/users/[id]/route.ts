import { adminApi, adminJson } from '@/lib/admin-catalog';
import type { NextRequest } from 'next/server';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return adminJson(await adminApi(request, '/admin/users/' + encodeURIComponent((await params).id), {
    method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(await request.json().catch(() => null))
  }));
}
