import { NextRequest } from 'next/server';
import { customerQuoteApi, customerQuoteJson } from '@/lib/admin-customers-quotes';
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return customerQuoteJson(
    await customerQuoteApi(request, `/admin/operations/customers/${encodeURIComponent(id)}`)
  );
}
