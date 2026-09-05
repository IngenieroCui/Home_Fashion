import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookies, REFRESH_TOKEN_COOKIE, setSessionCookies } from '@/lib/auth/cookies';
import { refreshWithApi } from '@/lib/auth/server';
import { safePanelPath } from '@/lib/auth/session-redirect';

function expiredSession(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/iniciar-sesion', request.url));
  clearSessionCookies(response);
  return response;
}

export async function GET(request: NextRequest) {
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'same-site' && fetchSite !== 'none')
    return NextResponse.json({ message: 'Solicitud no permitida.' }, { status: 403 });
  const redirectUrl = new URL(safePanelPath(request.nextUrl.searchParams.get('next')), request.url);
  const response = NextResponse.redirect(redirectUrl);
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  if (!refreshToken) {
    return expiredSession(request);
  }
  const result = await refreshWithApi(refreshToken);
  if (!result.data && (result.status === 0 || result.status >= 500)) {
    return NextResponse.redirect(new URL('/iniciar-sesion?reason=unavailable', request.url));
  }
  if (!result.data || result.data.user.role === 'WORKSHOP') {
    return expiredSession(request);
  }
  try {
    setSessionCookies(response, result.data.accessToken, result.data.refreshToken);
    return response;
  } catch {
    return expiredSession(request);
  }
}
