import { deliveriesApi, deliveriesJson } from '@/app/api/admin/deliveries/_server';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.toString();
  return deliveriesJson(
    await deliveriesApi(request, `/admin/delivery-assignees${query ? `?${query}` : ''}`)
  );
}
