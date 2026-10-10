'use client';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { clientFetch } from '@/lib/client-fetch';
import { confirmAction } from '@/lib/confirm-action';
import { optionalText, type Customer } from '@/lib/customer-quote-utils';
async function api<T>(url: string, init: RequestInit): Promise<T> {
  const response = await clientFetch(url, {
    ...init,
    headers: { 'content-type': 'application/json' }
  });
  const body = (await response.json().catch(() => null)) as { message?: string } | null;
  if (!response.ok) throw new Error(body?.message || 'No fue posible guardar el cliente.');
  return body as T;
}
function FormError({ message }: { message: string | null }) {
  return message ? (
    <p className="form-error" role="alert">
      {message}
    </p>
  ) : null;
}
type CustomerField =
  | 'fullName'
  | 'documentType'
  | 'documentNumber'
  | 'phone'
  | 'email'
  | 'city'
  | 'neighborhood'
  | 'address'
  | 'notes';
export function CustomerForm({
  customer,
  onSaved
}: {
  customer?: Customer;
  onSaved?: (customer: Customer) => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const fullName = optionalText(form.get('fullName'));
    const phone = optionalText(form.get('phone'));
    if (!fullName || !phone) {
      setError('El nombre y el teléfono son obligatorios.');
      return;
    }
    const payload: Record<string, unknown> = {
      fullName,
      phone,
      documentType: optionalText(form.get('documentType')) ?? null,
      documentNumber: optionalText(form.get('documentNumber')) ?? null,
      email: optionalText(form.get('email'))?.toLowerCase() ?? null,
      city: optionalText(form.get('city')) ?? null,
      neighborhood: optionalText(form.get('neighborhood')) ?? null,
      address: optionalText(form.get('address')) ?? null,
      notes: optionalText(form.get('notes')) ?? null
    };
    if (customer) payload.isActive = form.get('isActive') === 'true';
    if (
      customer &&
      customer.isActive &&
      payload.isActive === false &&
      !(await confirmAction('¿Desactivar este cliente? Sus datos se conservarán.', 'Desactivar'))
    )
      return;
    setSaving(true);
    setError(null);
    try {
      const saved = await api<Customer>(
        customer ? `/api/admin/customers/${customer.id}` : '/api/admin/customers',
        { method: customer ? 'PATCH' : 'POST', body: JSON.stringify(payload) }
      );
      onSaved?.(saved);
      if (!customer) router.replace(`/panel/clientes/${saved.id}?created=1`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No fue posible guardar el cliente.');
    } finally {
      setSaving(false);
    }
  }
  const value = (field: CustomerField) => customer?.[field] ?? '';
  return (
    <form className="admin-form admin-form-wide" onSubmit={submit}>
      <label>
        Nombre completo
        <input defaultValue={String(value('fullName'))} name="fullName" required />
      </label>
      <label>
        Tipo de documento
        <select defaultValue={String(value('documentType'))} name="documentType">
          <option value="">Sin especificar</option>
          <option value="CC">CC</option>
          <option value="CE">CE</option>
          <option value="NIT">NIT</option>
          <option value="PASSPORT">Pasaporte</option>
          <option value="OTHER">Otro</option>
        </select>
      </label>
      <label>
        Número de documento
        <input defaultValue={String(value('documentNumber'))} name="documentNumber" />
      </label>
      <label>
        Teléfono
        <input defaultValue={String(value('phone'))} name="phone" required />
      </label>
      <label>
        Correo
        <input defaultValue={String(value('email'))} name="email" type="email" />
      </label>
      <label>
        Ciudad
        <input defaultValue={String(value('city'))} name="city" />
      </label>
      <label>
        Barrio
        <input defaultValue={String(value('neighborhood'))} name="neighborhood" />
      </label>
      <label>
        Dirección
        <input defaultValue={String(value('address'))} name="address" />
      </label>
      <label>
        Notas
        <textarea defaultValue={String(value('notes'))} name="notes" />
      </label>
      {customer && (
        <label>
          Estado
          <select defaultValue={customer.isActive ? 'true' : 'false'} name="isActive">
            <option value="true">Activo</option>
            <option value="false">Inactivo</option>
          </select>
        </label>
      )}
      <FormError message={error} />
      <div className="admin-actions">
        <button className="button-link" disabled={saving} type="submit">
          {saving ? 'Guardando…' : 'Guardar cliente'}
        </button>
        <Link className="button-link button-link-secondary" href="/panel/clientes">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
