'use client';

import { useEffect, useState } from 'react';
import { userMessage } from './user-message';

type PageData = { data: unknown[]; pagination: { page: number; totalPages: number } };

/** A superseded request must never replace the currently selected filters. */
export function usePageData<T extends PageData>(url: string) {
  const [result, setResult] = useState<{ url: string; page: T | null; error: string | null }>({
    url,
    page: null,
    error: null
  });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setResult({ url, page: null, error: null });
    async function load() {
      try {
        const response = await fetch(url, {
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20000)])
        });
        if (!response.ok) throw new Error(userMessage(response.status));
        const body = (await response.json().catch(() => null)) as T | null;
        if (
          !body ||
          !Array.isArray(body.data) ||
          !body.pagination ||
          !Number.isInteger(body.pagination.page) ||
          !Number.isInteger(body.pagination.totalPages)
        ) {
          throw new Error('No pudimos leer la información. Inténtalo nuevamente.');
        }
        if (!controller.signal.aborted) setResult({ url, page: body, error: null });
      } catch (reason) {
        if (!controller.signal.aborted) {
          const message =
            reason instanceof Error &&
            !(reason instanceof TypeError) &&
            !(reason instanceof DOMException)
              ? reason.message
              : 'La conexión tardó demasiado o se interrumpió. Revisa tu conexión e inténtalo nuevamente.';
          setResult({ url, page: null, error: message });
        }
      }
    }
    void load();
    return () => controller.abort();
  }, [url, attempt]);
  return {
    page: result.url === url ? result.page : null,
    error: result.url === url ? result.error : null,
    retry: () => setAttempt((value) => value + 1)
  };
}
