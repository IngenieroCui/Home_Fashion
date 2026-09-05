/** Do not retry mutations: a lost response does not mean the operation failed. */
export async function clientFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  try {
    return await fetch(input, { ...init, signal: init.signal ?? AbortSignal.timeout(45000) });
  } catch (error) {
    if (init.signal?.aborted && init.signal.reason?.name === 'AbortError') throw error;
    const mutation = init.method && !['GET', 'HEAD'].includes(init.method.toUpperCase());
    throw new Error(
      mutation
        ? 'No pudimos confirmar la operación. Revisa tu conexión y comprueba si se guardó antes de volver a enviarla.'
        : 'No pudimos cargar la información. Revisa tu conexión y vuelve a intentarlo.'
    );
  }
}
