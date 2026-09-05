import 'server-only';
import { clearSessionCookies, setSessionCookies } from '@/lib/auth/cookies';
import { authenticatedApi } from '@/lib/auth/proxy';
import type { RefreshResponse } from '@/lib/auth/types';
import { NextResponse } from 'next/server';

type Result = { status: number; body: unknown; refreshed?: RefreshResponse; expired?: boolean };

export const workshopJobsApi = authenticatedApi;

function safeMessage(body: unknown, status: number) {
  const message =
    typeof body === 'object' &&
    body !== null &&
    typeof (body as { message?: unknown }).message === 'string'
      ? (body as { message: string }).message
      : '';
  const messages: Array<[RegExp, string]> = [
    [
      /already has a workshop job/i,
      'Este elemento ya fue asignado; otro usuario pudo haberlo hecho.'
    ],
    [/only MADE_TO_ORDER/i, 'Solo los elementos de fabricación bajo pedido pueden asignarse.'],
    [/PENDING_PRODUCTION/i, 'El elemento ya no está pendiente de fabricación.'],
    [/destination user must have/i, 'El usuario seleccionado no es un taller elegible.']
  ];
  const translated = messages.find(([pattern]) => pattern.test(message))?.[1];
  if (translated) return translated;
  return (
    {
      400: 'Revisa los datos de la asignación.',
      401: 'La sesión ha finalizado.',
      403: 'No tienes permiso para esta operación.',
      404: 'No encontramos el recurso solicitado.',
      409: 'Este elemento ya fue asignado; recargamos el pedido para mostrar la asignación.',
      503: 'El servicio no está disponible.'
    }[status] ?? 'No fue posible completar la operación.'
  );
}

export function workshopJobsJson(result: Result) {
  const response = NextResponse.json(
    result.status >= 200 && result.status < 300
      ? result.body
      : { message: safeMessage(result.body, result.status) },
    { status: result.status }
  );
  if (result.refreshed)
    setSessionCookies(response, result.refreshed.accessToken, result.refreshed.refreshToken);
  if (result.expired) clearSessionCookies(response);
  return response;
}
