'use client';
/* eslint-disable @next/next/no-img-element -- Administration previews preserve the upload URL. */
import { clientFetch } from '@/lib/client-fetch';
import { confirmAction } from '@/lib/confirm-action';
import { useState, type FormEvent } from 'react';
import { api, ErrorMessage, type Product } from './catalog-shared';

export function ProductImages({
  product,
  onSaved
}: {
  product: Product;
  onSaved: (message: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const images = [
    ...(product.images ?? []).map((image) => ({ ...image, variantName: 'Producto' })),
    ...(product.variants ?? []).flatMap((variant) =>
      (variant.images ?? []).map((image) => ({
        ...image,
        variantName: variant.name || variant.sku
      }))
    )
  ];

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const file = form.get('file');
    if (!(file instanceof File) || !file.size || file.size > 10 * 1024 * 1024) {
      setError('Selecciona una imagen de hasta 10 MB.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await clientFetch(
        `/api/admin/catalog/products/${product.id}/images/upload`,
        {
          method: 'POST',
          body: form
        }
      );
      if (response.status === 401) window.location.assign('/iniciar-sesion');
      const body = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) throw new Error(body.message ?? 'No fue posible subir la imagen.');
      onSaved('Imagen subida correctamente.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No fue posible subir la imagen.');
    } finally {
      setSaving(false);
    }
  }

  async function changeImage(id: string, action: 'primary' | 'delete') {
    if (
      action === 'delete' &&
      !(await confirmAction('¿Eliminar esta imagen? Esta acción no se puede deshacer.', 'Eliminar'))
    )
      return;
    setSaving(true);
    setError(null);
    try {
      await api(
        `/api/admin/catalog/images/${id}`,
        action === 'delete'
          ? { method: 'DELETE' }
          : { method: 'PATCH', body: JSON.stringify({ isPrimary: true }) }
      );
      onSaved(action === 'delete' ? 'Imagen eliminada.' : 'Imagen principal actualizada.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No fue posible actualizar la imagen.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-stack">
      <form className="admin-form" onSubmit={upload}>
        <label>
          Archivo{' '}
          <input
            accept="image/jpeg,image/png,image/webp,image/gif"
            name="file"
            required
            type="file"
          />
        </label>
        <label>
          Mostrar en
          <select name="productVariantId" defaultValue="">
            <option value="">Producto</option>
            {(product.variants ?? []).map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.name || variant.sku}
              </option>
            ))}
          </select>
        </label>
        <label>
          Texto alternativo <input name="altText" placeholder="Describe la imagen" />
        </label>
        <label className="check-label">
          <input defaultChecked={!images.length} name="isPrimary" type="checkbox" value="true" />{' '}
          Imagen principal
        </label>
        <ErrorMessage message={error} />
        <button className="button-link" disabled={saving} type="submit">
          {saving ? 'Subiendo…' : 'Subir imagen'}
        </button>
      </form>
      <div className="admin-image-list">
        {images.map((image) => (
          <div key={image.id}>
            <img alt={image.altText ?? ''} src={image.url} />
            <p>
              {image.variantName}
              {image.isPrimary ? ' · Principal' : ''}
            </p>
            <div className="admin-actions">
              {!image.isPrimary && (
                <button
                  className="text-link"
                  disabled={saving}
                  onClick={() => void changeImage(image.id, 'primary')}
                  type="button"
                >
                  Hacer principal
                </button>
              )}
              <button
                className="text-link"
                disabled={saving}
                onClick={() => void changeImage(image.id, 'delete')}
                type="button"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
      {!images.length && <p className="notice">Aún no hay imágenes.</p>}
    </div>
  );
}
