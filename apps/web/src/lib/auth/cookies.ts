import 'server-only';
import type { NextResponse } from 'next/server';

export const ACCESS_TOKEN_COOKIE = 'hf_access_token';
export const REFRESH_TOKEN_COOKIE = 'hf_refresh_token';

type JwtPayload = { exp?: number };

export function tokenExpiry(token: string): Date | null {
  const payload = token.split('.')[1];
  if (!payload) return null;
  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(Buffer.from(normalized, 'base64').toString('utf8')) as JwtPayload;
    return typeof decoded.exp === 'number' && decoded.exp * 1000 > Date.now()
      ? new Date(decoded.exp * 1000)
      : null;
  } catch {
    return null;
  }
}

function options(token: string) {
  const expires = tokenExpiry(token);
  if (!expires) throw new Error('Invalid session token');
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires
  };
}

export function setSessionCookies(
  response: NextResponse,
  accessToken: string,
  refreshToken: string
) {
  // Keep the expired JWT available until the refresh session expires so BFF
  // handlers can observe a 401 and rotate the session server-side.
  response.cookies.set(ACCESS_TOKEN_COOKIE, accessToken, options(refreshToken));
  response.cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, options(refreshToken));
}

export function clearSessionCookies(response: NextResponse) {
  const options = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0
  };
  response.cookies.set(ACCESS_TOKEN_COOKIE, '', options);
  response.cookies.set(REFRESH_TOKEN_COOKIE, '', options);
}
