import { adminApi, adminJson } from '@/lib/admin-catalog';
import type { NextRequest } from 'next/server';

type Route = { params: Promise<{ id: string }> };
const path = async ({ params }: Route) => '/admin/catalog/variants/' + encodeURIComponent((await params).id) + '/inventory-movements';

export async function GET(request: NextRequest, route: Route) {
  return adminJson(await adminApi(request, await path(route)));
}
export async function POST(request: NextRequest, route: Route) {
  return adminJson(await adminApi(request, await path(route), {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(await request.json().catch(() => null))
  }));
}
