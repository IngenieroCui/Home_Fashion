import { NextRequest, NextResponse } from 'next/server';
import { apiServerUrl } from '@/lib/auth/server';
async function proxy(token: string, checkout: boolean) {
  if (!/^[a-zA-Z0-9_-]{43}$/.test(token))
    return NextResponse.json({ message: 'Cobro no disponible.' }, { status: 404 });
  try {
    const response = await fetch(
      `${apiServerUrl()}/payments/public/${token}${checkout ? '/checkout' : ''}`,
      {
        method: checkout ? 'POST' : 'GET',
        cache: 'no-store',
        signal: AbortSignal.timeout(15000)
      }
    );
    return NextResponse.json(
      response.ok
        ? await response.json()
        : { message: 'Cobro no disponible. Solicita al comercio que lo revise.' },
      {
        status: response.status,
        headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' }
      }
    );
  } catch {
    return NextResponse.json({ message: 'No fue posible consultar el cobro.' }, { status: 503 });
  }
}
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  return proxy((await params).token, false);
}
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  return proxy((await params).token, true);
}
