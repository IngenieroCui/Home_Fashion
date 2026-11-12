'use client';
import { confirmAction } from '@/lib/confirm-action';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { api, ErrorMessage, type Status, type Category, type Product } from './catalog-shared';

export function ProductCreateForm({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError(null);
    try {
      const product = await api<Product>('/api/admin/catalog/products', {
        method: 'POST',
        body: JSON.stringify({
          categoryId: form.get('categoryId'),
          name: form.get('name'),
          slug: form.get('slug') || undefined,
          description: form.get('description'),
          allowsCustomization: form.get('allowsCustomization') === 'on',
          status: form.get('status')
        })
      });
      router.push(`/panel/catalogo/productos/${product.id}?created=1`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No fue posible crear el producto.');
    } finally {
      setSaving(false);
    }
  }
  return (
    <form className="admin-form admin-form-wide" onSubmit={submit}>
      <p className="notice">
        El producto inicia inactivo. Actívalo después de agregar una variante.
      </p>
      <label>
        Categoría
        <select name="categoryId" required>
          <option value="">Selecciona una categoría</option>
          {categories
            .filter((category) => category.isActive)
            .map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
        </select>
      </label>
      <label>
        Nombre
        <input name="name" required />
      </label>
      <label>
        Slug (opcional)
        <input name="slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" />
      </label>
      <label>
        Descripción
        <textarea name="description" required />
      </label>
      <label className="check-label">
        <input name="allowsCustomization" type="checkbox" /> Permite personalización
      </label>
      <label>
        Estado
        <select defaultValue="INACTIVE" name="status">
          <option value="INACTIVE">Inactivo</option>
          <option value="ACTIVE">Activo</option>
        </select>
      </label>
      <ErrorMessage message={error} />
      <button className="button-link" disabled={saving} type="submit">
        {saving ? 'Creando…' : 'Crear producto'}
      </button>
    </form>
  );
}

export function ProductEditForm({
  product,
  categories,
  onSaved
}: {
  product: Product;
  categories: Category[];
  onSaved: (message: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const status = form.get('status') as Status;
    if (
      status === 'ACTIVE' &&
      !(product.variants ?? []).some((variant) => variant.status === 'ACTIVE') &&
      !(await confirmAction(
        'Este producto no tiene variantes activas. El backend decidirá si puede activarse. ¿Deseas continuar?'
      ))
    )
      return;
    if (
      product.status === 'ACTIVE' &&
      status === 'INACTIVE' &&
      !(await confirmAction(
        '¿Desactivar este producto? Dejará de aparecer en el catálogo público.',
        'Desactivar'
      ))
    )
      return;
    setSaving(true);
    setError(null);
    try {
      await api(`/api/admin/catalog/products/${product.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          categoryId: form.get('categoryId'),
          name: form.get('name'),
          slug: form.get('slug') || undefined,
          description: form.get('description'),
          allowsCustomization: form.get('allowsCustomization') === 'on',
          status
        })
      });
      onSaved('Cambios del producto guardados.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No fue posible guardar el producto.');
    } finally {
      setSaving(false);
    }
  }
  return (
    <form className="admin-form admin-form-wide" onSubmit={submit}>
      <h2 className="font-serif text-2xl">Datos generales</h2>
      <label>
        Categoría
        <select defaultValue={product.categoryId} name="categoryId">
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Nombre
        <input defaultValue={product.name} name="name" required />
      </label>
      <label>
        Slug
        <input defaultValue={product.slug} name="slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" />
      </label>
      <label>
        Descripción
        <textarea defaultValue={product.description} name="description" required />
      </label>
      <label className="check-label">
        <input
          defaultChecked={product.allowsCustomization}
          name="allowsCustomization"
          type="checkbox"
        />{' '}
        Permite personalización
      </label>
      <label>
        Estado
        <select defaultValue={product.status} name="status">
          <option value="ACTIVE">Activo</option>
          <option value="INACTIVE">Inactivo</option>
        </select>
      </label>
      <ErrorMessage message={error} />
      <button className="button-link" disabled={saving} type="submit">
        {saving ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </form>
  );
}
