import { salesApi, salesJson } from '@/lib/admin-sales';
import { NextRequest } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; paymentId: string }> }
) {
  const { id, paymentId } = await params;
  const body = await request.json().catch(() => null);
  return salesJson(
    await salesApi(
      request,
      `/admin/sales/${encodeURIComponent(id)}/payments/${encodeURIComponent(paymentId)}/void`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body)
      }
    )
  );
}
