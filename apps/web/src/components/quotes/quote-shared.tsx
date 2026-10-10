'use client';
import { StatusBadge } from '../ui/status-badge';
import { clientFetch } from '@/lib/client-fetch';
import { money, quoteStatusLabel, type QuoteStatus } from '@/lib/customer-quote-utils';

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await clientFetch(path, {
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers }
  });
  const body = (await response.json().catch(() => null)) as { message?: string } | null;
  if (!response.ok) throw new Error(body?.message ?? 'No fue posible completar la operación.');
  return body as T;
}

export function FormError({ message }: { message: string | null }) {
  return message ? (
    <p className="form-error" role="alert">
      {message}
    </p>
  ) : null;
}
export function MoneyDisplay({ value }: { value: string | number | null | undefined }) {
  return <span>{money(value)}</span>;
}
export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  return (
    <StatusBadge className={`quote-status quote-status-${status.toLowerCase()}`}>
      {quoteStatusLabel[status]}
    </StatusBadge>
  );
}
