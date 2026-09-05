import { salesApi, salesJson } from '@/lib/admin-sales';
import { NextRequest } from 'next/server';
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ quoteId: string }> }
) {
  const { quoteId } = await params;
  return salesJson(
    await salesApi(request, `/admin/sales/from-quote/${encodeURIComponent(quoteId)}`, {
      method: 'POST'
    })
  );
}
