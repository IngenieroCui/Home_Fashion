import 'server-only';
import { clearSessionCookies, setSessionCookies } from '@/lib/auth/cookies';
import { authenticatedApi } from '@/lib/auth/proxy';
import type { RefreshResponse } from '@/lib/auth/types';
import { NextResponse } from 'next/server';

type Result = { status: number; body: unknown; refreshed?: RefreshResponse; expired?: boolean };

export const deliveriesApi = authenticatedApi;

function safeMessage(body: unknown, status: number) {
  const message =
    typeof body === 'object' &&
    body !== null &&
    typeof (body as { message?: unknown }).message === 'string'
      ? (body as { message: string }).message
      : '';
  const messages: Array<[RegExp, string]> = [
    [/Order already has a delivery/i, 'Este pedido ya tiene una entrega programada.'],
    [
      /Order cannot receive a delivery/i,
      'El estado actual del pedido no permite programar una entrega.'
    ],
    [/Order not found/i, 'No encontramos el pedido.'],
    [/Assigned user not found/i, 'El responsable seleccionado ya no está disponible.'],
    [/Assigned user is inactive/i, 'El responsable seleccionado está inactivo.'],
    [/requires an active ADMIN/i, 'Selecciona un propietario activo.'],
    [/requires an active EMPLOYEE/i, 'Selecciona un empleado activo.'],
    [/requires an assigned user/i, 'Selecciona un responsable interno.'],
    [/requires a driver name/i, 'Escribe el nombre del conductor externo.'],
    [
      /cannot have an assigned user/i,
      'El conductor externo no puede tener un usuario interno asignado.'
    ],
    [
      /cannot have an external driver name/i,
      'Un responsable interno no puede incluir un conductor externo.'
    ],
    [
      /Only a SCHEDULED delivery can start/i,
      'Solo una entrega programada puede ponerse en camino.'
    ],
    [
      /Every non-cancelled order item/i,
      'Todos los elementos vigentes deben estar reservados o listos antes de iniciar.'
    ],
    [/Order has no items available/i, 'El pedido no tiene elementos disponibles para entregar.'],
    [
      /Only an OUT_FOR_DELIVERY delivery can be completed/i,
      'Solo una entrega en camino puede completarse.'
    ],
    [
      /Order cannot be completed through delivery/i,
      'El estado actual del pedido no permite completar la entrega.'
    ],
    [
      /Order item state changed/i,
      'El estado de un elemento cambió. Recarga antes de completar la entrega.'
    ],
    [/Delivery cannot be cancelled/i, 'Esta entrega ya no se puede cancelar.'],
    [/Delivery not found/i, 'No encontramos la entrega.']
  ];
  const translated = messages.find(([pattern]) => pattern.test(message))?.[1];
  if (translated) return translated;
  return (
    {
      400: 'Revisa los datos de la entrega.',
      401: 'La sesión ha finalizado.',
      403: 'No tienes permiso para gestionar entregas.',
      404: 'No encontramos el recurso solicitado.',
      409: 'La información cambió mientras realizabas la operación. Recarga e intenta de nuevo.',
      503: 'El servicio no está disponible.'
    }[status] ?? 'No fue posible completar la operación.'
  );
}

export function deliveriesJson(result: Result) {
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

function optionalText(value: unknown) {
  return typeof value === 'string' ? value.trim() || undefined : undefined;
}

export function sanitizedCreatePayload(body: unknown) {
  const value = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
  return {
    orderId: optionalText(value.orderId),
    address: optionalText(value.address),
    addressReference: optionalText(value.addressReference),
    contactName: optionalText(value.contactName),
    contactPhone: optionalText(value.contactPhone),
    scheduledDate: optionalText(value.scheduledDate),
    timeWindow: optionalText(value.timeWindow),
    deliveryType: optionalText(value.deliveryType),
    assignedUserId: optionalText(value.assignedUserId),
    externalDriverName: optionalText(value.externalDriverName),
    fee: optionalText(value.fee),
    notes: optionalText(value.notes)
  };
}

export function sanitizedCompletePayload(body: unknown) {
  const value = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
  return {
    receiverName: optionalText(value.receiverName),
    evidenceUrls: Array.isArray(value.evidenceUrls)
      ? value.evidenceUrls.map(optionalText).filter((url): url is string => Boolean(url))
      : []
  };
}
