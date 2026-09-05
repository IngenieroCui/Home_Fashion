import 'server-only';
import { userMessage } from './user-message';
import { clearSessionCookies, setSessionCookies } from '@/lib/auth/cookies';
import { authenticatedApi } from '@/lib/auth/proxy';
import type { RefreshResponse } from '@/lib/auth/types';
import { NextResponse } from 'next/server';

type ApiResult = { status: number; body: unknown; refreshed?: RefreshResponse; expired?: boolean };

export const customerQuoteApi = authenticatedApi;

function safeMessage(status: number) {
  return userMessage(status);
}

export function customerQuoteJson(result: ApiResult) {
  const body =
    result.status >= 200 && result.status < 300
      ? result.body
      : { message: safeMessage(result.status) };
  const response = NextResponse.json(body, { status: result.status });
  if (result.refreshed)
    setSessionCookies(response, result.refreshed.accessToken, result.refreshed.refreshToken);
  if (result.expired) clearSessionCookies(response);
  return response;
}
