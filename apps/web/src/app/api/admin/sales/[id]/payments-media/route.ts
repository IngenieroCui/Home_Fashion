import { NextRequest, NextResponse } from 'next/server';
import { salesApi, salesJson } from '@/lib/admin-sales';
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.formData().catch(() => null);
  if (!body)
    return NextResponse.json({ message: 'Selecciona un comprobante válido.' }, { status: 400 });
  return salesJson(
    await salesApi(request, `/admin/sales/${encodeURIComponent(id)}/payments-media`, {
      method: 'POST',
      body
    })
  );
}
