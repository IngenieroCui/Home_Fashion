'use client';
import { useEffect, useState } from 'react';
import { userMessage } from './user-message';

export function useOperationData<T>(url: string) {
  const [result, setResult] = useState<{ url: string; data: T | null; error: string | null }>({
    url,
    data: null,
    error: null
  });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setResult({ url, data: null, error: null });
    async function load() {
      try {
        const response = await fetch(url, {
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20000)])
        });
        if (!response.ok) throw new Error(userMessage(response.status));
        const body = (await response.json()) as T;
        if (!body) throw new Error('No pudimos leer la información.');
        if (!controller.signal.aborted) setResult({ url, data: body, error: null });
      } catch (reason) {
        if (!controller.signal.aborted)
          setResult({
            url,
            data: null,
            error:
              reason instanceof Error &&
              !(reason instanceof TypeError) &&
              !(reason instanceof DOMException)
                ? reason.message
                : 'La conexión se interrumpió. Vuelve a intentarlo.'
          });
      }
    }
    void load();
    return () => controller.abort();
  }, [url, attempt]);
  return {
    data: result.url === url ? result.data : null,
    error: result.url === url ? result.error : null,
    retry: () => setAttempt((value) => value + 1)
  };
}
