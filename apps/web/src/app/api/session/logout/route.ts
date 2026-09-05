import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookies, REFRESH_TOKEN_COOKIE } from '@/lib/auth/cookies';
import { logoutWithApi } from '@/lib/auth/server';

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  if (refreshToken) await logoutWithApi(refreshToken);
  const response = NextResponse.json({ ok: true });
  clearSessionCookies(response);
  return response;
}
