import 'server-only';
import { userMessage } from './user-message';
import { clearSessionCookies, setSessionCookies } from '@/lib/auth/cookies';
import { authenticatedApi } from '@/lib/auth/proxy';
import type { RefreshResponse } from '@/lib/auth/types';
import { NextResponse } from 'next/server';
type Result = { status: number; body: unknown; refreshed?: RefreshResponse; expired?: boolean };
export const salesApi = authenticatedApi;

function safeMessage(body: unknown, status: number) {
  const fallback: Record<number, string> = {
    400: 'Revisa los datos de la venta.',
    401: 'La sesión ha finalizado.',
    403: 'No tienes permiso para esta operación.',
    404: 'No encontramos el recurso solicitado.',
    409: 'La cotización ya fue convertida en una venta.',
    503: 'El servicio no está disponible.'
  };
  const message =
    typeof body === 'object' &&
    body !== null &&
    typeof (body as { message?: unknown }).message === 'string'
      ? (body as { message: string }).message
      : '';
  if (status === 400 && /fotografías|comprobante/i.test(message)) return 'Selecciona un comprobante JPG, PNG o WebP de hasta 10 MB.';
  const paymentMessages: Array<[RegExp, string]> = [
    [/must be greater than zero/i, 'El monto debe ser mayor que cero.'],
    [/cannot exceed the current balance/i, 'El monto supera el saldo disponible.'],
    [/FINAL_PAYMENT must equal/i, 'El pago final debe coincidir exactamente con el saldo.'],
    [/Refund cannot exceed/i, 'La devolución supera el total pagado.'],
    [/adjustmentEffect is required/i, 'Selecciona el efecto del ajuste.'],
    [/cannot make amount paid negative/i, 'El ajuste dejaría el total pagado por debajo de cero.'],
    [/only be registered for confirmed/i, 'La venta no está confirmada.'],
    [/balance inconsistent/i, 'La anulación dejaría el saldo en un estado inconsistente.']
  ];
  const paymentMessage = paymentMessages.find(([pattern]) => pattern.test(message))?.[1];
  if (paymentMessage) return paymentMessage;
  if (/Payment intent already used/i.test(message)) return 'Esta intención ya se usó. Revisa los movimientos antes de registrar otra.';
  if (/Wompi|Sandbox|importe supera|ADMIN/i.test(message)) return message;
  return userMessage(status, fallback[status]);
}
export function salesJson(result: Result) {
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
