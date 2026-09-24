import 'server-only';
import type { NextRequest } from 'next/server';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from './cookies';
import { apiServerUrl, refreshWithApi } from './server';
import { sessionRequest } from './session-request';

export function authenticatedApi(request: NextRequest, path: string, init: RequestInit = {}) {
  return sessionRequest(
    request.cookies.get(ACCESS_TOKEN_COOKIE)?.value,
    request.cookies.get(REFRESH_TOKEN_COOKIE)?.value,
    {
      refresh: refreshWithApi,
      request: async (token) => {
        try {
          const headers = new Headers(init.headers);
          headers.set('authorization', `Bearer ${token}`);
          return await fetch(`${apiServerUrl()}${path}`, {
            ...init,
            headers,
            cache: 'no-store',
            signal: AbortSignal.timeout(path.endsWith('/images/upload') ? 60000 : 15000)
          });
        } catch {
          return null;
        }
      }
    }
  );
}
