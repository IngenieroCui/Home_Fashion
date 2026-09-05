/** Only explicitly translated messages cross the API/UI boundary. */
export function userMessage(status: number, fallback?: string): string {
  const messages: Record<number, string> = {
    400: 'Revisa los campos obligatorios y el formato de los datos antes de continuar.',
    401: 'Tu sesión finalizó. Inicia sesión nuevamente para continuar.',
    403: 'Tu cuenta no tiene permiso para realizar esta acción.',
    404: 'No encontramos este registro. Puede que ya no esté disponible.',
    409: 'Los datos cambiaron o ya existe un registro con esta información. Actualiza la página antes de continuar.',
    413: 'La información supera el tamaño permitido. Reduce el texto e inténtalo nuevamente.',
    422: 'Revisa los datos ingresados antes de continuar.',
    429: 'Recibimos varios intentos seguidos. Espera un momento y vuelve a intentarlo.'
  };
  if (status >= 500 || status === 0)
    return 'No pudimos conectar con Home Fashion. Espera un momento y vuelve a intentarlo.';
  return messages[status] ?? fallback ?? 'No pudimos completar la operación. Inténtalo nuevamente.';
}
