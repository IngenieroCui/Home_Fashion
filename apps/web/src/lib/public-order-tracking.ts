import 'server-only';
import { apiServerUrl } from '@/lib/auth/server';
import type { PublicOrderTracking } from './order-tracking';

export async function getPublicOrderTracking(token: string): Promise<PublicOrderTracking | null> {
  try {
    const response = await fetch(`${apiServerUrl()}/public/tracking/${encodeURIComponent(token)}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) return null;
    return (await response.json()) as PublicOrderTracking;
  } catch {
    return null;
  }
}
