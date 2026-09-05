import {
  deliveriesApi,
  deliveriesJson,
  sanitizedCompletePayload
} from '@/app/api/admin/deliveries/_server';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  return deliveriesJson(
    await deliveriesApi(request, `/admin/deliveries/${encodeURIComponent(id)}/complete`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(sanitizedCompletePayload(body))
    })
  );
}
