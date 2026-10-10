'use client';
import Link from 'next/link';
import { clientFetch } from '@/lib/client-fetch';
import { type FormEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import {
  formatPrice,
  type CatalogProduct,
  type ProductImage as CatalogImage,
  type ProductVariant
} from '@/lib/catalog';
import type {
  PublicQuoteRequestError,
  PublicQuoteRequestResult
} from '@/lib/public-quote-requests';
import { ProductImage } from './product-image';
import { availabilityLabel } from '@/lib/product-selection';

type Props = {
  product: CatalogProduct;
  selectedVariant?: ProductVariant;
  selectedVariantId: string;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  variantChoices: ReactNode;
  image?: CatalogImage;
  onLockedChange: (locked: boolean) => void;
};
const customFields = [
  ['dimensions', 'Medidas', 160],
  ['material', 'Material', 160],
  ['fabric', 'Tela', 120],
  ['color', 'Color', 100],
  ['finish', 'Acabado', 120],
  ['details', 'Otros detalles', 500]
] as const;
export function PublicQuoteRequestForm({
  product,
  selectedVariant,
  selectedVariantId,
  quantity,
  onQuantityChange,
  variantChoices,
  image,
  onLockedChange
}: Props) {
  const steps = product.allowsCustomization
    ? ['Tu mueble', 'Personalización', 'Tus datos']
    : ['Tu mueble', 'Tus datos'];
  const [step, setStep] = useState(0);
  const [showChoices, setShowChoices] = useState(false);
  const [personalize, setPersonalize] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const requestIdRef = useRef<string | null>(null);
  const payloadRef = useRef<object | null>(null);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const [networkError, setNetworkError] = useState(false);
  const [result, setResult] = useState<PublicQuoteRequestResult | null>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const hasMoved = useRef(false);
  const locked = Boolean(payloadRef.current);
  const custom = selectedVariantId === 'CUSTOM' || personalize;
  useEffect(() => {
    if (hasMoved.current) title.current?.focus();
  }, [step, result]);
  const change = (field: string, value: string) => setValues((old) => ({ ...old, [field]: value }));
  const price =
    selectedVariant && Number.isInteger(quantity) && quantity > 0
      ? formatPrice(String(Number(selectedVariant.salePrice) * quantity))
      : 'Precio por definir';
  function move(next: number) {
    hasMoved.current = true;
    setError('');
    setStep(next);
  }
  function next(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
      setError('La cantidad debe ser un número entero entre 1 y 20.');
      return;
    }
    if (!selectedVariantId) {
      setError('Elige una opción disponible.');
      return;
    }
    if (step < steps.length - 1) {
      move(step + 1);
      return;
    }
    void submit();
  }
  async function submit() {
    if (submittingRef.current || conflict) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError('');
    setNetworkError(false);
    requestIdRef.current ??= crypto.randomUUID();
    const customization = custom
      ? Object.fromEntries(
          customFields
            .map(([field]) => [field, (values[field] ?? '').trim()])
            .filter(([, value]) => value)
        )
      : undefined;
    // Freeze the exact first payload: a retry after an uncertain response uses the same key AND content.
    payloadRef.current ??= {
      requestId: requestIdRef.current,
      fullName: values.fullName ?? '',
      phone: values.phone ?? '',
      email: values.email || undefined,
      productId: product.id,
      productVariantId: selectedVariant?.id,
      quantity,
      ...(customization && Object.keys(customization).length ? { customization } : {}),
      message: values.message || undefined
    };
    onLockedChange(true);
    try {
      const response = await clientFetch('/api/public/quote-requests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payloadRef.current)
      });
      const body = (await response.json().catch(() => null)) as
        PublicQuoteRequestResult | PublicQuoteRequestError | null;
      if (!response.ok || !body || !('received' in body)) {
        if (response.status === 409) setConflict(true);
        else if (response.status >= 400 && response.status < 500) {
          payloadRef.current = null;
          requestIdRef.current = null;
          onLockedChange(false);
        }
        setError(
          body && 'message' in body
            ? body.message
            : 'No pudimos enviar tu solicitud. Tus datos siguen aquí.'
        );
        return;
      }
      hasMoved.current = true;
      setResult(body);
      requestIdRef.current = null;
      payloadRef.current = null;
    } catch {
      setNetworkError(true);
      setError('No pudimos conectarnos. Tus datos siguen aquí.');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }
  function prepareNew() {
    payloadRef.current = null;
    requestIdRef.current = null;
    setConflict(false);
    setError('');
    setNetworkError(false);
    onLockedChange(false);
  }
  if (!(
    product.variants?.some((variant) => variant.status === 'ACTIVE') || product.allowsCustomization
  ))
    return null;
  const summary = (
    <div className="quote-summary">
      <ProductImage
        image={image}
        alt={product.name}
        width={200}
        widths={[120, 200, 320]}
        sizes="128px"
      />
      <div>
        <strong>{product.name}</strong>
        <p>{selectedVariant?.name || selectedVariant?.sku || 'Diseño personalizado'}</p>
        <p>
          {quantity} unidad{quantity === 1 ? '' : 'es'} · {availabilityLabel(selectedVariant)}
        </p>
        <b>{price}</b>
        <small>Precio orientativo; se confirma al cotizar.</small>
        {custom && (
          <p>
            Personalización:{' '}
            {customFields
              .map(([field, label]) => (values[field] ? `${label}: ${values[field]}` : ''))
              .filter(Boolean)
              .join(' · ') || 'Diseño a tu medida'}
          </p>
        )}
      </div>
    </div>
  );
  return (
    <section
      aria-labelledby="quote-request-title"
      className="quote-wizard mt-14 scroll-mt-8"
      id="solicitar-cotizacion"
    >
      {result ? (
        <div className="quote-success" role="status">
          <span className="success-mark" aria-hidden="true">
            ✓
          </span>
          <h2 ref={title} tabIndex={-1} id="quote-request-title">
            Solicitud recibida
          </h2>
          <strong>{result.requestCode}</strong>
          <p>Guardamos tu solicitud.</p>
          <h3>¿Qué sigue?</h3>
          <ol>
            <li>Home Fashion revisará los detalles</li>
            <li>Preparará una cotización</li>
            <li>Te contactará para confirmarla</li>
          </ol>
          <Link className="button-link" href="/catalogo">
            Seguir explorando
          </Link>
        </div>
      ) : (
        <>
          <p className="eyebrow">Solicitud sin compromiso</p>
          <h2 className="font-serif text-3xl">Cotiza {product.name}</h2>
          <ol className="wizard-progress" aria-label="Pasos de la cotización">
            {steps.map((label, index) => (
              <li key={label} aria-current={step === index ? 'step' : undefined}>
                <span>{index + 1}</span>
                {label}
              </li>
            ))}
          </ol>
          <h3 ref={title} tabIndex={-1} id="quote-request-title" className="font-serif text-2xl">
            {steps[step]}
          </h3>
          <form onSubmit={next} className="wizard-form">
            {step === 0 && (
              <>
                {summary}
                <div className="admin-actions">
                  <span>
                    Opción elegida:{' '}
                    {selectedVariant?.name || selectedVariant?.sku || 'Diseño personalizado'}
                  </span>
                  <button
                    type="button"
                    className="button-link button-link-secondary"
                    aria-expanded={showChoices}
                    aria-controls="wizard-variant-choices"
                    disabled={locked}
                    onClick={() => setShowChoices((current) => !current)}
                  >
                    {showChoices ? 'Cerrar opciones' : 'Cambiar'}
                  </button>
                </div>
                {showChoices && <div id="wizard-variant-choices">{variantChoices}</div>}
                <label>
                  Cantidad
                  <input
                    inputMode="numeric"
                    name="quantity"
                    type="number"
                    min={1}
                    max={20}
                    step={1}
                    value={quantity || ''}
                    required
                    disabled={locked}
                    aria-describedby={error ? 'quote-error' : undefined}
                    onChange={(event) => onQuantityChange(Number(event.target.value))}
                  />
                </label>
              </>
            )}
            {product.allowsCustomization && step === 1 && (
              <>
                {selectedVariantId !== 'CUSTOM' && (
                  <fieldset disabled={locked}>
                    <legend>¿Quieres agregar detalles personalizados?</legend>
                    <label className="check-label">
                      <input
                        type="radio"
                        name="personalize"
                        checked={!personalize}
                        onChange={() => setPersonalize(false)}
                      />
                      No, usar esta referencia
                    </label>
                    <label className="check-label">
                      <input
                        type="radio"
                        name="personalize"
                        checked={personalize}
                        onChange={() => setPersonalize(true)}
                      />
                      Sí, quiero personalizar
                    </label>
                  </fieldset>
                )}
                {custom && (
                  <div className="wizard-fields">
                    {customFields.map(([field, label, max]) => (
                      <label key={field}>
                        {label} <small>(opcional)</small>
                        {field === 'details' ? (
                          <textarea
                            disabled={locked}
                            maxLength={max}
                            value={values[field] ?? ''}
                            onChange={(event) => change(field, event.target.value)}
                          />
                        ) : (
                          <input
                            disabled={locked}
                            maxLength={max}
                            value={values[field] ?? ''}
                            onChange={(event) => change(field, event.target.value)}
                          />
                        )}
                      </label>
                    ))}
                  </div>
                )}
              </>
            )}
            {step === steps.length - 1 && (
              <>
                {summary}
                <div className="wizard-fields">
                  <label>
                    Nombre
                    <input
                      name="fullName"
                      autoComplete="name"
                      required
                      minLength={2}
                      maxLength={180}
                      disabled={locked}
                      value={values.fullName ?? ''}
                      onChange={(event) => change('fullName', event.target.value)}
                    />
                  </label>
                  <label>
                    Teléfono
                    <input
                      inputMode="tel"
                      name="phone"
                      type="tel"
                      autoComplete="tel"
                      required
                      minLength={7}
                      maxLength={60}
                      pattern={String.raw`(?=(?:\D*\d){7,})[+0-9\(\) .\-]{7,60}`}
                      disabled={locked}
                      value={values.phone ?? ''}
                      onChange={(event) => change('phone', event.target.value)}
                    />
                  </label>
                  <label>
                    Correo <small>(opcional)</small>
                    <input
                      name="email"
                      type="email"
                      autoComplete="email"
                      maxLength={254}
                      disabled={locked}
                      value={values.email ?? ''}
                      onChange={(event) => change('email', event.target.value)}
                    />
                  </label>
                  <label>
                    Mensaje <small>(opcional)</small>
                    <textarea
                      name="message"
                      maxLength={1000}
                      disabled={locked}
                      value={values.message ?? ''}
                      onChange={(event) => change('message', event.target.value)}
                    />
                  </label>
                </div>
              </>
            )}
            {error && (
              <p id="quote-error" className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="admin-actions">
              {step > 0 && (
                <button
                  className="button-link button-link-secondary"
                  type="button"
                  disabled={submitting}
                  onClick={() => move(step - 1)}
                >
                  Atrás
                </button>
              )}
              {conflict && (
                <button
                  className="button-link button-link-secondary"
                  type="button"
                  onClick={prepareNew}
                >
                  Preparar nueva solicitud
                </button>
              )}
              {networkError && (
                <button
                  className="button-link button-link-secondary"
                  type="button"
                  onClick={prepareNew}
                >
                  Editar datos
                </button>
              )}
              <button className="button-link" type="submit" disabled={submitting || conflict}>
                {submitting
                  ? 'Enviando…'
                  : step < steps.length - 1
                    ? 'Continuar'
                    : networkError
                      ? 'Reintentar'
                      : 'Enviar solicitud'}
              </button>
            </div>
            <small>No realizas ningún pago al enviar esta solicitud.</small>
          </form>
        </>
      )}
    </section>
  );
}
