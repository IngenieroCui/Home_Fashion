import { adminApi, adminJson } from '@/lib/admin-catalog';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  return adminJson(await adminApi(request, '/admin/users'));
}
export async function POST(request: NextRequest) {
  return adminJson(await adminApi(request, '/admin/users', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(await request.json().catch(() => null))
  }));
}
