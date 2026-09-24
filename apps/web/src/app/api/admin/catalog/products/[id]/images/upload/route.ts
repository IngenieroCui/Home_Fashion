import { adminApi, adminJson } from '@/lib/admin-catalog';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.formData().catch(() => null);
  if (!body) return NextResponse.json({ message: 'Imagen inválida.' }, { status: 400 });
  return adminJson(await adminApi(request, `/admin/catalog/products/${encodeURIComponent(id)}/images/upload`, {
    method: 'POST',
    body
  }));
}
