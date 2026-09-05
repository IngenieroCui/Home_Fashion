import { customerQuoteApi, customerQuoteJson } from '@/lib/admin-customers-quotes';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.toString();
  return customerQuoteJson(
    await customerQuoteApi(request, `/admin/quotes${query ? `?${query}` : ''}`)
  );
}
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  return customerQuoteJson(
    await customerQuoteApi(request, '/admin/quotes', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    })
  );
}
