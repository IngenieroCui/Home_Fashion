import 'server-only';
import { createHash } from 'node:crypto';
import { createRefreshCoordinator } from './refresh-coordinator';
import { cookies } from 'next/headers';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from './cookies';
import type { LoginResponse, MeResponse, RefreshResponse } from './types';

export function apiServerUrl() {
  return (
    process.env.API_SERVER_URL ??
    (process.env.NODE_ENV === 'development' ? process.env.NEXT_PUBLIC_API_URL : undefined) ??
    'http://localhost:3001/api'
  ).replace(/\/$/, '');
}

async function authRequest<T>(
  path: string,
  init: RequestInit
): Promise<{ data: T | null; status: number }> {
  try {
    const response = await fetch(`${apiServerUrl()}${path}`, {
      ...init,
      cache: 'no-store',
      signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) return { data: null, status: response.status };
    return { data: (await response.json()) as T, status: response.status };
  } catch {
    return { data: null, status: 0 };
  }
}

export const loginWithApi = (email: string, password: string) =>
  authRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

const coordinatedRefresh = createRefreshCoordinator(
  (refreshToken: string) =>
    authRequest<RefreshResponse>('/auth/refresh', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    }),
  (result) => result.data !== null
);

export const refreshWithApi = (refreshToken: string) =>
  coordinatedRefresh(refreshToken, createHash('sha256').update(refreshToken).digest('hex'));

export const logoutWithApi = (refreshToken: string) =>
  authRequest<unknown>('/auth/logout', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });

export async function sessionTokens() {
  const store = await cookies();
  return {
    accessToken: store.get(ACCESS_TOKEN_COOKIE)?.value,
    refreshToken: store.get(REFRESH_TOKEN_COOKIE)?.value
  };
}

export async function getAuthenticatedUser(accessToken?: string): Promise<MeResponse | null> {
  if (!accessToken) return null;
  const result = await authRequest<MeResponse>('/auth/me', {
    headers: { authorization: `Bearer ${accessToken}` }
  });
  return result.status === 200 ? result.data : null;
}
