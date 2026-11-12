import 'server-only';
import { clearSessionCookies, setSessionCookies } from '@/lib/auth/cookies';
import { authenticatedApi } from '@/lib/auth/proxy';
import type { RefreshResponse } from '@/lib/auth/types';
import { NextResponse } from 'next/server';

export type CatalogStatus = 'ACTIVE' | 'INACTIVE';
export type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  productCount?: number;
};
export type AdminImage = {
  id: string;
  url: string;
  altText: string | null;
  position: number;
  isPrimary: boolean;
};
export type AdminVariant = {
  id: string;
  productId: string;
  sku: string;
  name: string | null;
  dimensions: string | null;
  material: string | null;
  color: string | null;
  fabric: string | null;
  finish: string | null;
  salePrice: string;
  estimatedCost?: string | null;
  quantityOnHand: number;
  quantityReserved: number;
  location: string | null;
  status: CatalogStatus;
  images?: AdminImage[];
};
export type AdminProduct = {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string;
  allowsCustomization: boolean;
  status: CatalogStatus;
  category?: AdminCategory;
  variants?: AdminVariant[];
  images?: AdminImage[];
  primaryImage?: AdminImage | null;
  variantCount?: number;
};
export type Pagination = { page: number; limit: number; total: number; totalPages: number };
export type Paginated<T> = { data: T[]; pagination: Pagination };

type ApiResult = { status: number; body: unknown; refreshed?: RefreshResponse; expired?: boolean };

export const adminApi = authenticatedApi;

export function adminJson(result: ApiResult) {
  const messages: Record<number, string> = {
    400: 'Revisa los datos ingresados.',
    401: 'La sesión ha finalizado.',
    403: 'No tienes permiso para esta operación.',
    404: 'No encontramos el recurso solicitado.',
    409: 'Ya existe un registro con esos datos.',
    503: 'El servicio no está disponible.'
  };
  const backendMessage = typeof result.body === 'object' && result.body !== null ? (result.body as { message?: unknown }).message : null;
  if (result.status === 400 && typeof backendMessage === 'string' && /quantityReserved cannot exceed quantityOnHand|chk_product_variants_reserved_quantity/i.test(backendMessage)) messages[400] = 'No puedes reducir las existencias por debajo de las unidades reservadas.';
  const body =
    result.status >= 200 && result.status < 300
      ? result.body
      : { message: messages[result.status] ?? 'No fue posible completar la operación.' };
  const response = NextResponse.json(body, { status: result.status });
  if (result.refreshed)
    setSessionCookies(response, result.refreshed.accessToken, result.refreshed.refreshToken);
  if (result.expired) clearSessionCookies(response);
  return response;
}

export function numberOrNull(value: FormDataEntryValue | null): number | null {
  if (value === null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function adminCatalogQuery(filters: {
  q?: string;
  categoryId?: string;
  status?: string;
  allowsCustomization?: string;
  page?: string;
}) {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.categoryId) params.set('categoryId', filters.categoryId);
  if (filters.status === 'ACTIVE' || filters.status === 'INACTIVE')
    params.set('status', filters.status);
  if (filters.allowsCustomization === 'true' || filters.allowsCustomization === 'false')
    params.set('allowsCustomization', filters.allowsCustomization);
  if (filters.page && Number(filters.page) > 1) params.set('page', filters.page);
  return params.toString();
}
