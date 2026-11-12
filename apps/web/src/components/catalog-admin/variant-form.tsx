'use client';
import { confirmAction } from '@/lib/confirm-action';
import { useState, type FormEvent } from 'react';
import { formNumber, variantCostPatch } from '@/lib/admin-catalog-utils';
import { api, ErrorMessage, type Status, type Variant } from './catalog-shared';

export type VariantFinancialAccess = { price: boolean; cost: boolean };

export function VariantForm({
  financialAccess,
  productId,
  variant,
  onCancel,
  onSaved
}: {
  financialAccess: VariantFinancialAccess;
  productId: string;
  variant: Variant | null;
  onCancel: () => void;
  onSaved: (message: string) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const salePrice = formNumber(form.get('salePrice'));
    const quantityOnHand = variant?.quantityOnHand ?? formNumber(form.get('quantityOnHand'));
    const quantityReserved = variant?.quantityReserved ?? 0;
    const estimatedCost = formNumber(form.get('estimatedCost'));
    if (
      (financialAccess.price && (salePrice === null || salePrice <= 0)) ||
      quantityOnHand === null ||
      quantityOnHand < 0 ||
      quantityReserved > quantityOnHand ||
      (financialAccess.cost && form.get('estimatedCost') !== '' && (estimatedCost === null || estimatedCost < 0))
    ) {
      setError('Revisa precio e inventario. Las reservas no pueden superar las existencias.');
      return;
    }
    const body = {
      sku: form.get('sku'),
      name: form.get('name') || undefined,
      dimensions: form.get('dimensions') || undefined,
      material: form.get('material') || undefined,
      color: form.get('color') || undefined,
      fabric: form.get('fabric') || undefined,
      finish: form.get('finish') || undefined,
      ...(financialAccess.price && (!variant || salePrice !== Number(variant.salePrice)) ? { salePrice } : {}),
      ...(financialAccess.cost ? variantCostPatch(variant, estimatedCost) : {}),
      ...(!variant ? { quantityOnHand } : {}),
      location: form.get('location') || undefined,
      status: form.get('status') as Status
    };
    if (
      variant?.status === 'ACTIVE' &&
      body.status === 'INACTIVE' &&
      !(await confirmAction(
        '¿Desactivar esta variante? Dejará de estar disponible para nuevas solicitudes.',
        'Desactivar'
      ))
    )
      return;
    setSaving(true);
    setError(null);
    try {
      await api(
        variant
          ? `/api/admin/catalog/variants/${variant.id}`
          : `/api/admin/catalog/products/${productId}/variants`,
        { method: variant ? 'PATCH' : 'POST', body: JSON.stringify(body) }
      );
      onCancel();
      onSaved(variant ? 'Variante actualizada.' : 'Variante creada.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No fue posible guardar la variante.');
    } finally {
      setSaving(false);
    }
  }
  const value = (field: keyof Variant) => variant?.[field] ?? '';
  return (
    <form className="admin-form admin-form-wide" onSubmit={submit}>
      <h3>{variant ? 'Editar variante' : 'Nueva variante'}</h3>
      <label>
        SKU
        <input defaultValue={String(value('sku'))} name="sku" required />
      </label>
      <label>
        Nombre
        <input defaultValue={String(value('name'))} name="name" />
      </label>
      <label>
        Dimensiones
        <input defaultValue={String(value('dimensions'))} name="dimensions" />
      </label>
      <label>
        Material
        <input defaultValue={String(value('material'))} name="material" />
      </label>
      <label>
        Color
        <input defaultValue={String(value('color'))} name="color" />
      </label>
      <label>
        Tela
        <input defaultValue={String(value('fabric'))} name="fabric" />
      </label>
      <label>
        Acabado
        <input defaultValue={String(value('finish'))} name="finish" />
      </label>
      {financialAccess.price && <label>
        Precio de venta
        <input
          inputMode="decimal"
          defaultValue={String(value('salePrice'))}
          min="0.01"
          name="salePrice"
          step="0.01"
          type="number"
          required
        />
      </label>}
      {financialAccess.cost && <label>
        Costo estimado (opcional)
        <input
          inputMode="decimal"
          defaultValue={variant?.estimatedCost ?? ''}
          min="0"
          name="estimatedCost"
          step="0.01"
          type="number"
        />
      </label>}
      <label>
        Existencias físicas
        <input
          inputMode="numeric"
          defaultValue={String(value('quantityOnHand') || '0')}
          readOnly={Boolean(variant)}
          min="0"
          name="quantityOnHand"
          step="1"
          type="number"
          required
        />
      </label>
      {variant && (
        <div className="notice">
          <p>Reservadas por pedidos: {variant.quantityReserved}</p>
          <p>Disponibles: {variant.quantityOnHand - variant.quantityReserved}</p>
          <p>Las reservas son gestionadas automáticamente por los pedidos.</p>
        </div>
      )}
      <label>
        Ubicación
        <input defaultValue={String(value('location'))} name="location" />
      </label>
      <label>
        Estado
        <select defaultValue={String(value('status') || 'ACTIVE')} name="status">
          <option value="ACTIVE">Activa</option>
          <option value="INACTIVE">Inactiva</option>
        </select>
      </label>
      <ErrorMessage message={error} />
      <div className="admin-actions">
        <button className="button-link" disabled={saving} type="submit">
          {saving ? 'Guardando…' : 'Guardar variante'}
        </button>
        <button className="button-link button-link-secondary" onClick={onCancel} type="button">
          Cancelar
        </button>
      </div>
    </form>
  );
}
