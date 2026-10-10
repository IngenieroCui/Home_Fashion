'use client';
import { StatusBadge as Badge } from '../ui/status-badge';
import { clientFetch } from '@/lib/client-fetch';

export type Status = 'ACTIVE' | 'INACTIVE';
export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  productCount?: number;
};
export type Image = { id: string; url: string; altText: string | null; isPrimary: boolean };
export type Variant = {
  id: string;
  sku: string;
  name: string | null;
  dimensions: string | null;
  material: string | null;
  color: string | null;
  fabric: string | null;
  finish: string | null;
  salePrice: string;
  estimatedCost: string | null;
  quantityOnHand: number;
  quantityReserved: number;
  location: string | null;
  status: Status;
  images?: Image[];
};
export type Product = {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string;
  allowsCustomization: boolean;
  status: Status;
  category?: Category;
  variants?: Variant[];
  images?: Image[];
  primaryImage?: Image | null;
  variantCount?: number;
};
export type Page<T> = {
  data: T[];
  pagination: { page: number; totalPages: number; total: number };
};

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await clientFetch(path, {
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers }
  });
  if (response.status === 401) window.location.assign('/iniciar-sesion');
  const body = (await response.json().catch(() => ({}))) as T & { message?: string };
  if (!response.ok) throw new Error(body.message ?? 'No fue posible completar la operación.');
  return body;
}

export function StatusBadge({ status }: { status: Status }) {
  return (
    <Badge tone={status === 'ACTIVE' ? 'success' : 'neutral'}>
      {status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
    </Badge>
  );
}
export function ErrorMessage({ message }: { message: string | null }) {
  return message ? (
    <p className="form-error" role="alert">
      {message}
    </p>
  ) : null;
}
export { formatMoney as money } from '@/lib/formatters';
