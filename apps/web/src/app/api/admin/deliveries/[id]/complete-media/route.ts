import { deliveriesApi, deliveriesJson } from '@/app/api/admin/deliveries/_server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.formData().catch(() => null);
  if (!body) return NextResponse.json({ message: 'Selecciona fotografías válidas.' }, { status: 400 });
  return deliveriesJson(await deliveriesApi(request, `/admin/deliveries/${encodeURIComponent(id)}/complete-media`, { method: 'POST', body }));
}
