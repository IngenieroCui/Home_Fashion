import { NextRequest, NextResponse } from 'next/server';
import { salesApi, salesJson } from '@/lib/admin-sales';
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return salesJson(
    await salesApi(request, `/admin/sales/${encodeURIComponent(id)}/payment-attempts`)
  );
}
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ message: 'Importe inválido.' }, { status: 400 });
  return salesJson(
    await salesApi(request, `/admin/sales/${encodeURIComponent(id)}/payment-attempts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    })
  );
}
