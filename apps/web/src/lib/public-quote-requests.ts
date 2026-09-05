export type PublicQuoteRequestResult = {
  received: true;
  requestCode: string;
  status: 'REQUESTED';
};

export type PublicQuoteRequestError = {
  message: string;
};

export function publicQuoteRequestMessage(status: number) {
  if (status === 400)
    return 'Revisa tus datos de contacto, la cantidad y las opciones del producto.';
  if (status === 404) return 'El producto o la variante ya no está disponible.';
  if (status === 409)
    return 'Esta solicitud ya se recibió con otros datos. Inicia una nueva solicitud si deseas cambiarla.';
  if (status === 413)
    return 'La solicitud contiene demasiada información. Reduce el texto e inténtalo nuevamente.';
  if (status === 429) return 'Espera un momento antes de enviar otra solicitud.';
  return 'No pudimos enviar tu solicitud. Inténtalo nuevamente en unos minutos.';
}
