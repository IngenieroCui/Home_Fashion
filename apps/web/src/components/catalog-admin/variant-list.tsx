'use client';
import { useState } from 'react';
import { StatusBadge, money, type Variant, type Product } from './catalog-shared';
import { VariantForm } from './variant-form';

export function VariantList({
  product,
  onSaved
}: {
  product: Product;
  onSaved: (message: string) => void;
}) {
  const [editing, setEditing] = useState<Variant | null>(null);
  const [adding, setAdding] = useState(false);
  return (
    <div className="admin-stack">
      {(product.variants ?? []).map((variant) => (
        <article className="admin-variant" key={variant.id}>
          <div>
            <strong>{variant.sku}</strong>
            <p>
              {variant.name ?? 'Sin nombre'} · {money(variant.salePrice)} · Disponible:{' '}
              {variant.quantityOnHand - variant.quantityReserved}
            </p>
            <StatusBadge status={variant.status} />
          </div>
          <button
            className="text-link"
            onClick={() => {
              setEditing(variant);
              setAdding(false);
            }}
            type="button"
          >
            Editar
          </button>
        </article>
      ))}
      {!product.variants?.length ? <p className="notice">Aún no hay variantes.</p> : null}
      <button
        className="button-link button-link-secondary"
        onClick={() => {
          setAdding(true);
          setEditing(null);
        }}
        type="button"
      >
        Nueva variante
      </button>
      {adding || editing ? (
        <VariantForm
          onCancel={() => {
            setAdding(false);
            setEditing(null);
          }}
          onSaved={onSaved}
          productId={product.id}
          variant={editing}
        />
      ) : null}
    </div>
  );
}
