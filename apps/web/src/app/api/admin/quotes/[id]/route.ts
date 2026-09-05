import { customerQuoteApi, customerQuoteJson } from '@/lib/admin-customers-quotes';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return customerQuoteJson(
    await customerQuoteApi(request, `/admin/quotes/${encodeURIComponent(id)}`)
  );
}
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  return customerQuoteJson(
    await customerQuoteApi(request, `/admin/quotes/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    })
  );
}
