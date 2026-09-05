import {
  deliveriesApi,
  deliveriesJson,
  sanitizedCreatePayload
} from '@/app/api/admin/deliveries/_server';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.toString();
  return deliveriesJson(
    await deliveriesApi(request, `/admin/deliveries${query ? `?${query}` : ''}`)
  );
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  return deliveriesJson(
    await deliveriesApi(request, '/admin/deliveries', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(sanitizedCreatePayload(body))
    })
  );
}
