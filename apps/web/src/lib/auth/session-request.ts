import type { RefreshResponse } from './types';

export type SessionApiResult = {
  status: number;
  body: unknown;
  refreshed?: RefreshResponse;
  expired?: boolean;
};

type Dependencies = {
  request: (token: string) => Promise<Response | null>;
  refresh: (token: string) => Promise<{ data: RefreshResponse | null; status: number }>;
};

/** Keep renewed cookies even when the operation following refresh fails. */
export async function sessionRequest(
  access: string | undefined,
  refresh: string | undefined,
  api: Dependencies
): Promise<SessionApiResult> {
  let token = access;
  let refreshed: RefreshResponse | undefined;
  async function renew(): Promise<SessionApiResult | null> {
    if (!refresh) return { status: 401, body: null, expired: true };
    const result = await api.refresh(refresh);
    if (!result.data) {
      const expired = result.status === 401 || result.status === 403;
      return { status: expired ? 401 : 503, body: null, expired };
    }
    refreshed = result.data;
    token = result.data.accessToken;
    return null;
  }
  if (!token) {
    const failure = await renew();
    if (failure) return failure;
  }
  let response = await api.request(token!);
  if (response?.status === 401 && !refreshed) {
    const failure = await renew();
    if (failure) return failure;
    response = await api.request(token!);
  }
  if (!response) return { status: 503, body: null, refreshed };
  const body: unknown = await response.json().catch(() => null);
  if (response.ok && body === null) return { status: 502, body: null, refreshed };
  return { status: response.status, body, refreshed, expired: response.status === 401 };
}
