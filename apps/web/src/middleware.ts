import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set('x-hf-panel-path', request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: ['/panel/:path*'] };
