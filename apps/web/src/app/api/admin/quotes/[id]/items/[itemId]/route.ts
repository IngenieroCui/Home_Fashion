import { customerQuoteApi, customerQuoteJson } from '@/lib/admin-customers-quotes';
import { NextRequest } from 'next/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { id, itemId } = await params;
  const body = await request.json().catch(() => null);
  return customerQuoteJson(
    await customerQuoteApi(
      request,
      `/admin/quotes/${encodeURIComponent(id)}/items/${encodeURIComponent(itemId)}`,
      {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body)
      }
    )
  );
}
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { id, itemId } = await params;
  return customerQuoteJson(
    await customerQuoteApi(
      request,
      `/admin/quotes/${encodeURIComponent(id)}/items/${encodeURIComponent(itemId)}`,
      { method: 'DELETE' }
    )
  );
}
