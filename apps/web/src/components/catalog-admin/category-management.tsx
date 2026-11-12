'use client';
import { confirmAction } from '@/lib/confirm-action';
import { useState, type FormEvent } from 'react';
import { api, ErrorMessage, StatusBadge, type Category } from './catalog-shared';

export function CategoryManager({
  categories,
  onChanged
}: {
  categories: Category[];
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const isActive = form.get('isActive') === 'true';
    if (
      editing?.isActive &&
      !isActive &&
      !(await confirmAction(
        '¿Desactivar esta categoría? Sus productos no se modificarán.',
        'Desactivar'
      ))
    )
      return;
    setSaving(true);
    setError(null);
    const body = {
      name: String(form.get('name') ?? ''),
      slug: String(form.get('slug') ?? '') || undefined,
      description: String(form.get('description') ?? '') || undefined,
      isActive
    };
    try {
      await api(
        editing ? `/api/admin/catalog/categories/${editing.id}` : '/api/admin/catalog/categories',
        { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(body) }
      );
      setEditing(null);
      onChanged();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No fue posible guardar la categoría.');
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="admin-section">
      <div className="admin-section-title">
        <div>
          <h2 className="font-serif text-2xl">Categorías</h2>
          <p>Incluye categorías activas e inactivas.</p>
        </div>
        <button
          className="button-link button-link-secondary"
          onClick={() => {
            setOpen(!open);
            setEditing(null);
          }}
          type="button"
        >
          {open ? 'Cerrar' : 'Gestionar categorías'}
        </button>
      </div>
      {open ? (
        <div className="admin-category-grid">
          <form key={editing?.id ?? 'new'} className="admin-form" onSubmit={submit}>
            <h3>{editing ? 'Editar categoría' : 'Nueva categoría'}</h3>
            <label>
              Nombre
              <input defaultValue={editing?.name} name="name" required />
            </label>
            <label>
              Slug (opcional)
              <input defaultValue={editing?.slug} name="slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" />
            </label>
            <label>
              Descripción
              <textarea defaultValue={editing?.description ?? ''} name="description" />
            </label>
            <label>
              Estado
              <select defaultValue={editing?.isActive === false ? 'false' : 'true'} name="isActive">
                <option value="true">Activa</option>
                <option value="false">Inactiva</option>
              </select>
            </label>
            <ErrorMessage message={error} />
            <button className="button-link" disabled={saving} type="submit">
              {saving ? 'Guardando…' : 'Guardar categoría'}
            </button>
          </form>
          <div className="admin-category-list">
            {categories.map((category) => (
              <article key={category.id}>
                <div>
                  <strong>{category.name}</strong>
                  <small>
                    /{category.slug} · {category.productCount ?? 0} productos
                  </small>
                </div>
                <StatusBadge status={category.isActive ? 'ACTIVE' : 'INACTIVE'} />
                <button
                  className="text-link"
                  onClick={() => {
                    setEditing(category);
                    setError(null);
                  }}
                  type="button"
                >
                  Editar
                </button>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
