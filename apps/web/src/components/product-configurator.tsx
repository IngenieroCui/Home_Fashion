'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { formatPrice, type CatalogProduct, type ProductVariant } from '@/lib/catalog';
import { availabilityLabel, variantImages } from '@/lib/product-selection';
import { ProductGallery } from './product-gallery';
import { PublicQuoteRequestForm } from './public-quote-request-form';

export function VariantChoices({
  variants,
  allowsCustomization,
  selectedVariantId,
  onChange,
  disabled = false
}: {
  variants: ProductVariant[];
  allowsCustomization: boolean;
  selectedVariantId: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const group = useId();
  return (
    <fieldset className="variant-choices" disabled={disabled}>
      <legend>Elige tu opción</legend>
      <div>
        {variants.map((variant) => (
          <label
            className={`variant-option ${variant.id === selectedVariantId ? 'is-selected' : ''}`}
            key={variant.id}
          >
            <input
              type="radio"
              name={group}
              value={variant.id}
              checked={variant.id === selectedVariantId}
              onChange={() => onChange(variant.id)}
            />
            <strong>{variant.name || variant.sku}</strong>
            <small>SKU: {variant.sku}</small>
            {(variant.color || variant.material) && (
              <span>{[variant.color, variant.material].filter(Boolean).join(' · ')}</span>
            )}
            <b>{formatPrice(variant.salePrice)}</b>
            <small>{availabilityLabel(variant)}</small>
          </label>
        ))}
        {allowsCustomization && (
          <label
            className={`variant-option ${selectedVariantId === 'CUSTOM' ? 'is-selected' : ''}`}
          >
            <input
              type="radio"
              name={group}
              checked={selectedVariantId === 'CUSTOM'}
              onChange={() => onChange('CUSTOM')}
            />
            <strong>Diseño personalizado</strong>
            <span>Cuéntanos tu idea</span>
            <b>Precio por definir</b>
          </label>
        )}
      </div>
    </fieldset>
  );
}
export function ProductConfigurator({
  product,
  initialVariantId
}: {
  product: CatalogProduct;
  initialVariantId?: string;
}) {
  const variants = product.variants?.filter((variant) => variant.status === 'ACTIVE') ?? [];
  const [selectedVariantId, setSelectedVariantId] = useState(
    variants.find((variant) => variant.id === initialVariantId)?.id ??
      variants[0]?.id ??
      (product.allowsCustomization ? 'CUSTOM' : '')
  );
  const [quantity, setQuantity] = useState(1);
  const [locked, setLocked] = useState(false);
  const [quoteVisible, setQuoteVisible] = useState(false);
  const [enteredQuote, setEnteredQuote] = useState(false);
  const quoteRef = useRef<HTMLDivElement>(null);
  const selected = variants.find((variant) => variant.id === selectedVariantId);
  const images = variantImages(product, selected);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setQuoteVisible(entry.isIntersecting));
    if (quoteRef.current) observer.observe(quoteRef.current);
    return () => observer.disconnect();
  }, []);
  function changeVariant(id: string) {
    setSelectedVariantId(id);
    const url = new URL(window.location.href);
    if (id === 'CUSTOM') url.searchParams.delete('variant');
    else url.searchParams.set('variant', id);
    window.history.replaceState(window.history.state, '', url);
  }
  const choices = (
    <VariantChoices
      variants={variants}
      allowsCustomization={product.allowsCustomization}
      selectedVariantId={selectedVariantId}
      onChange={changeVariant}
      disabled={locked}
    />
  );
  const canRequest = Boolean(variants.length || product.allowsCustomization);
  return (
    <>
      <div className="mt-8 grid gap-10 lg:grid-cols-2">
        <ProductGallery key={selectedVariantId} images={images} name={product.name} />
        <section>
          <p className="eyebrow">{product.category?.name}</p>
          <h1 className="mt-2 font-serif text-5xl">{product.name}</h1>
          <div aria-live="polite">
            <p className="product-detail-price">
              {selected ? formatPrice(selected.salePrice) : 'Precio por definir'}
            </p>
            <p className="availability">{availabilityLabel(selected)}</p>
          </div>
          <p className="mt-5 leading-7">{product.description}</p>
          {canRequest && <div className="mt-6">{choices}</div>}
          {selected && (
            <dl className="variant-details" aria-live="polite">
              {[
                ['SKU', selected.sku],
                ['Medidas', selected.dimensions],
                ['Material', selected.material],
                ['Color', selected.color],
                ['Tela', selected.fabric],
                ['Acabado', selected.finish]
              ]
                .filter(([, value]) => value)
                .map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
            </dl>
          )}
          {canRequest && (
            <a
              className="button-link mt-6"
              href="#solicitar-cotizacion"
              onClick={() => setEnteredQuote(true)}
            >
              Solicitar cotización de esta opción
            </a>
          )}
        </section>
      </div>
      <div ref={quoteRef} onFocusCapture={() => setEnteredQuote(true)}>
        <PublicQuoteRequestForm
          product={product}
          selectedVariant={selected}
          selectedVariantId={selectedVariantId}
          quantity={quantity}
          onQuantityChange={setQuantity}
          variantChoices={choices}
          image={images[0]}
          onLockedChange={setLocked}
        />
      </div>
      {canRequest && !quoteVisible && !enteredQuote && (
        <div className="mobile-quote-cta">
          <span>{selected ? formatPrice(selected.salePrice) : 'Precio por definir'}</span>
          <a
            href="#solicitar-cotizacion"
            className="button-link"
            onClick={() => setEnteredQuote(true)}
          >
            Cotizar
          </a>
        </div>
      )}
    </>
  );
}
