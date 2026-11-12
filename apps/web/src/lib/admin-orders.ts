import 'server-only';
import { clearSessionCookies, setSessionCookies } from '@/lib/auth/cookies';
import { authenticatedApi } from '@/lib/auth/proxy';
import type { RefreshResponse } from '@/lib/auth/types';
import { NextResponse } from 'next/server';
type Result = { status: number; body: unknown; refreshed?: RefreshResponse; expired?: boolean };
export const ordersApi = authenticatedApi;

function safeMessage(body: unknown, status: number) {
  const message =
    typeof body === 'object' &&
    body !== null &&
    typeof (body as { message?: unknown }).message === 'string'
      ? (body as { message: string }).message
      : '';
  if (status === 400 && message === 'Esta venta ya tiene un pedido') return 'Esta venta ya tiene un pedido.';
  if (status === 400 && message === 'Solo las ventas confirmadas pueden crear pedidos') return 'Solo las ventas confirmadas pueden crear pedidos.';
  const orders: Array<[RegExp, string]> = [
    [/already converted/i, 'Esta venta ya tiene un pedido.'],
    [
      /Insufficient finished inventory/i,
      'No hay inventario terminado suficiente para uno de los elementos.'
    ],
    [/IN_STOCK items require/i, 'Un elemento sin variante debe fabricarse bajo pedido.'],
    [/Sale has no items/i, 'La venta no tiene elementos para convertir.']
  ];
  const translated = orders.find(([pattern]) => pattern.test(message))?.[1];
  if (translated) return translated;
  return (
    {
      400: 'Revisa la clasificación de los elementos.',
      401: 'La sesión ha finalizado.',
      403: 'No tienes permiso para esta operación.',
      404: 'No encontramos el recurso solicitado.',
      409: 'La venta ya fue convertida en un pedido.',
      503: 'El servicio no está disponible.'
    }[status] ?? 'No fue posible completar la operación.'
  );
}
export function ordersJson(result: Result) {
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
