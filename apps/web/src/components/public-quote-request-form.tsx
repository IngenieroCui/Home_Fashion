'use client';

import { clientFetch } from '@/lib/client-fetch';
import { FormEvent, useRef, useState } from 'react';
import type { ProductVariant } from '@/lib/catalog';
import type {
  PublicQuoteRequestError,
  PublicQuoteRequestResult
} from '@/lib/public-quote-requests';

type Props = {
  productId: string;
  productName: string;
  variants: ProductVariant[];
  allowsCustomization: boolean;
};

export function PublicQuoteRequestForm({
  productId,
  productName,
  variants,
  allowsCustomization
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const requestIdRef = useRef<string | null>(null);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const [result, setResult] = useState<PublicQuoteRequestResult | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    const target = event.currentTarget;
    setSubmitting(true);
    setError('');
    setResult(null);
    const form = new FormData(target);
    requestIdRef.current ??= crypto.randomUUID();
    const customization = allowsCustomization
      ? Object.fromEntries(
          ['dimensions', 'material', 'fabric', 'color', 'finish', 'details']
            .map((field) => [field, String(form.get(field) ?? '').trim()])
            .filter(([, value]) => value)
        )
      : undefined;
    const payload = {
      requestId: requestIdRef.current,
      fullName: String(form.get('fullName') ?? ''),
      phone: String(form.get('phone') ?? ''),
      email: String(form.get('email') ?? '') || undefined,
      productId,
      productVariantId:
        String(form.get('productVariantId') ?? '') === 'custom'
          ? undefined
          : String(form.get('productVariantId') ?? ''),
      quantity: Number(form.get('quantity')),
      ...(customization && Object.keys(customization).length ? { customization } : {}),
      message: String(form.get('message') ?? '') || undefined
    };

    try {
      const response = await clientFetch('/api/public/quote-requests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const body = (await response.json().catch(() => null)) as
        PublicQuoteRequestResult | PublicQuoteRequestError | null;
      if (!response.ok || !body || !('received' in body)) {
        if (response.status === 409) setConflict(true);
        setError(
          body && 'message' in body
            ? body.message
            : 'No pudimos enviar tu solicitud. Inténtalo nuevamente.'
        );
        return;
      }
      setResult(body);
      requestIdRef.current = null;
      target.reset();
    } catch {
      setError('No pudimos conectarnos. Revisa tu conexión e inténtalo nuevamente.');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  if (!variants.length && !allowsCustomization) {
    return (
      <section className="mt-14 scroll-mt-8" id="solicitar-cotizacion">
        <p className="notice">Este producto no admite solicitudes en este momento.</p>
      </section>
    );
  }

  const fieldClass = 'grid gap-2 text-sm font-bold text-[#51463d]';
  const controlClass =
    'w-full rounded-md border border-[#bcae9b] bg-white px-3 py-3 text-[#3d291e]';

  return (
    <section
      aria-labelledby="quote-request-title"
      className="mt-14 grid scroll-mt-8 gap-6 rounded-2xl border border-[#ddcfbc] bg-[#fffdf8] p-5 shadow-sm sm:p-8"
      id="solicitar-cotizacion"
    >
      <div>
        <p className="eyebrow">Solicitud sin compromiso</p>
        <h2 className="font-serif text-3xl text-[#3d291e]" id="quote-request-title">
          Cotiza {productName}
        </h2>
        <p className="mt-2 max-w-2xl leading-7 text-[#67574d]">
          Cuéntanos qué necesitas. El equipo de Home Fashion revisará la solicitud y se pondrá en
          contacto contigo.
        </p>
      </div>
      {result && (
        <div
          aria-live="polite"
          className="rounded-md border-l-4 border-[#65733d] bg-[#edf1e2] p-4 text-[#405027]"
          role="status"
        >
          <strong>Recibimos tu solicitud.</strong>
          <p className="mt-1">
            Tu código es <b>{result.requestCode}</b>. Guárdalo como referencia; pronto nos
            comunicaremos contigo.
          </p>
        </div>
      )}
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
        <label className={fieldClass}>
          Nombre completo
          <input
            autoComplete="name"
            className={controlClass}
            maxLength={180}
            minLength={2}
            name="fullName"
            required
          />
        </label>
        <label className={fieldClass}>
          Teléfono
          <input
            autoComplete="tel"
            className={controlClass}
            maxLength={60}
            minLength={7}
            name="phone"
            pattern={String.raw`(?=(?:\D*\d){7,})[+0-9\(\) .\-]{7,60}`}
            required
            type="tel"
          />
        </label>
        <label className={fieldClass}>
          Correo electrónico <span className="font-normal text-[#806d5b]">(opcional)</span>
          <input
            autoComplete="email"
            className={controlClass}
            maxLength={254}
            name="email"
            type="email"
          />
        </label>
        <label className={fieldClass}>
          Variante
          <select
            className={controlClass}
            defaultValue={variants[0]?.id ?? 'custom'}
            name="productVariantId"
            required
          >
            {allowsCustomization && <option value="custom">Diseño personalizado</option>}
            {variants.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.name || variant.sku}
              </option>
            ))}
          </select>
        </label>
        <label className={fieldClass}>
          Cantidad
          <input
            className={controlClass}
            defaultValue={1}
            max={20}
            min={1}
            name="quantity"
            required
            type="number"
          />
        </label>
        {allowsCustomization && (
          <fieldset className="grid gap-4 rounded-xl border border-[#eadfce] p-4 sm:col-span-2 sm:grid-cols-2">
            <legend className="px-1 font-serif text-lg font-bold text-[#3d291e]">
              Personalización{' '}
              <span className="font-sans text-sm font-normal text-[#806d5b]">(opcional)</span>
            </legend>
            <label className={fieldClass}>
              Medidas deseadas
              <input className={controlClass} maxLength={160} name="dimensions" />
            </label>
            <label className={fieldClass}>
              Material
              <input className={controlClass} maxLength={160} name="material" />
            </label>
            <label className={fieldClass}>
              Tela
              <input className={controlClass} maxLength={120} name="fabric" />
            </label>
            <label className={fieldClass}>
              Color
              <input className={controlClass} maxLength={100} name="color" />
            </label>
            <label className={fieldClass}>
              Acabado
              <input className={controlClass} maxLength={120} name="finish" />
            </label>
            <label className={`${fieldClass} sm:col-span-2`}>
              Otros detalles
              <textarea className={controlClass} maxLength={500} name="details" rows={3} />
            </label>
          </fieldset>
        )}
        <label className={`${fieldClass} sm:col-span-2`}>
          Mensaje <span className="font-normal text-[#806d5b]">(opcional)</span>
          <textarea className={controlClass} maxLength={1000} name="message" rows={4} />
        </label>
        {error && (
          <p aria-live="assertive" className="form-error sm:col-span-2" role="alert">
            {error}
          </p>
        )}
        <div className="flex flex-col items-start gap-3 sm:col-span-2 sm:flex-row sm:items-center">
          {conflict && (
            <button
              className="button-link button-link-secondary"
              type="button"
              onClick={() => {
                requestIdRef.current = null;
                setConflict(false);
                setError(
                  'Puedes enviar una nueva solicitud con estos datos. La solicitud anterior se conserva.'
                );
              }}
            >
              Preparar una nueva solicitud
            </button>
          )}
          <button className="button-link" disabled={submitting || conflict} type="submit">
            {submitting ? 'Enviando…' : 'Enviar solicitud'}
          </button>
          <small className="leading-5 text-[#67574d]">
            El precio mostrado es de referencia. No realizas ningún pago al enviar este formulario.
          </small>
        </div>
      </form>
    </section>
  );
}
