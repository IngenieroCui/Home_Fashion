import { salesApi, salesJson } from '@/lib/admin-sales';
import { NextRequest } from 'next/server';
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return salesJson(await salesApi(request, `/admin/sales/${encodeURIComponent(id)}`));
}
