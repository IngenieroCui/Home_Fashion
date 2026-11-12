import { NextRequest } from 'next/server';
import { customerQuoteApi, customerQuoteJson } from '@/lib/admin-customers-quotes';
export async function GET(request: NextRequest) {
  return customerQuoteJson(await customerQuoteApi(request, '/admin/operations/overview'));
}
