import { deliveriesApi, deliveriesJson } from '@/app/api/admin/deliveries/_server';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return deliveriesJson(
    await deliveriesApi(request, `/admin/deliveries/${encodeURIComponent(id)}/cancel`, {
      method: 'POST'
    })
  );
}
