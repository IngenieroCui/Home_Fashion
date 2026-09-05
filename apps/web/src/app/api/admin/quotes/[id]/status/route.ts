import { customerQuoteApi, customerQuoteJson } from '@/lib/admin-customers-quotes';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  return customerQuoteJson(
    await customerQuoteApi(request, `/admin/quotes/${encodeURIComponent(id)}/status`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    })
  );
}
