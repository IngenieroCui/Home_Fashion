'use client';
import Link from 'next/link';
import type { Customer } from '@/lib/sales';
import type { Dispatch, SetStateAction } from 'react';
export function SaleCustomerSection({
  customerQuery,
  setCustomerQuery,
  customer,
  setCustomer,
  customers
}: {
  customerQuery: string;
  setCustomerQuery: Dispatch<SetStateAction<string>>;
  customer: Customer | null;
  setCustomer: Dispatch<SetStateAction<Customer | null>>;
  customers: Customer[];
}) {
  return (
    <>
      {' '}
      <label>
        Buscar cliente
        <input
          onChange={(event) => setCustomerQuery(event.target.value)}
          placeholder="Nombre, documento o teléfono"
          type="search"
          value={customerQuery}
        />
      </label>
      <label>
        Cliente seleccionado
        <select
          onChange={(event) =>
            setCustomer(customers.find((entry) => entry.id === event.target.value) ?? customer)
          }
          required
          value={customer?.id ?? ''}
        >
          <option value="">Selecciona un cliente</option>
          {customer && !customers.some((entry) => entry.id === customer.id) && (
            <option value={customer.id}>{customer.fullName}</option>
          )}
          {customers.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.fullName} · {entry.documentNumber ?? 'Sin documento'} ·{' '}
              {entry.phone ?? 'Sin teléfono'}
            </option>
          ))}
        </select>
        {customerQuery && !customers.length && (
          <small>No se encontraron clientes para la búsqueda.</small>
        )}
      </label>
      <Link className="text-link" href="/panel/clientes/nuevo">
        Registrar nuevo cliente
      </Link>
    </>
  );
}
