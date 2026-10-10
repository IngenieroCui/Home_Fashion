import { formatMoney } from './formatters';
export type Category = { id: string; name: string; slug: string; description: string | null };

export type ProductImage = {
  id: string;
  url: string;
  altText: string | null;
  position: number;
  isPrimary: boolean;
};

export type ProductVariant = {
  id: string;
  sku: string;
  name: string | null;
  dimensions: string | null;
  material: string | null;
  color: string | null;
  fabric: string | null;
  finish: string | null;
  salePrice: string;
  quantityOnHand?: number;
  quantityReserved?: number;
  location?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  availability?: number;
  images?: ProductImage[];
};

export type CatalogProduct = {
  id: string;
  name: string;
  slug: string;
  description: string;
  allowsCustomization: boolean;
  category?: Pick<Category, 'id' | 'name' | 'slug'>;
  images?: ProductImage[];
  variants?: ProductVariant[];
};

export type PaginatedProducts = {
  data: CatalogProduct[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

export type CatalogFilters = {
  page?: number;
  limit?: number;
  q?: string;
  category?: string;
  allowsCustomization?: boolean;
  inStock?: boolean;
  sort?: 'name' | 'newest' | 'price-asc' | 'price-desc';
  minPrice?: number;
  maxPrice?: number;
};

export class CatalogApiError extends Error {
  constructor(public readonly status: number) {
    super(
      status === 404 ? 'No encontramos este producto.' : 'No fue posible consultar el catálogo.'
    );
  }
}

const apiUrl = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api').replace(/\/$/, '');

async function request<T>(path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiUrl}${path}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(15000)
    });
  } catch {
    throw new CatalogApiError(0);
  }
  if (!response.ok) throw new CatalogApiError(response.status);
  return response.json() as Promise<T>;
}

export function catalogQuery(filters: CatalogFilters): string {
  const params = new URLSearchParams();
  if (filters.page && filters.page > 1) params.set('page', String(filters.page));
  if (filters.limit && filters.limit !== 12) params.set('limit', String(filters.limit));
  if (filters.q) params.set('q', filters.q);
  if (filters.category) params.set('category', filters.category);
  if (filters.allowsCustomization) params.set('allowsCustomization', 'true');
  if (filters.inStock) params.set('inStock', 'true');
  if (filters.sort && filters.sort !== 'name') params.set('sort', filters.sort);
  if (filters.minPrice !== undefined) params.set('minPrice', String(filters.minPrice));
  if (filters.maxPrice !== undefined) params.set('maxPrice', String(filters.maxPrice));
  const query = params.toString();
  return query ? `?${query}` : '';
}

export const getCategories = () => request<Category[]>('/catalog/categories');
export function normalizeCatalogProduct(product: CatalogProduct): CatalogProduct {
  return {
    ...product,
    id: String(product.id),
    category: product.category
      ? { ...product.category, id: String(product.category.id) }
      : undefined,
    images: product.images?.map((image) => ({ ...image, id: String(image.id) })),
    variants: product.variants?.map((variant) => ({
      ...variant,
      id: String(variant.id),
      images: variant.images?.map((image) => ({ ...image, id: String(image.id) }))
    }))
  };
}
export async function getProducts(filters: CatalogFilters = {}) {
  const result = await request<PaginatedProducts>(`/catalog/products${catalogQuery(filters)}`);
  return { ...result, data: result.data.map(normalizeCatalogProduct) };
}
export async function getProduct(slug: string) {
  return normalizeCatalogProduct(
    await request<CatalogProduct>(`/catalog/products/${encodeURIComponent(slug)}`)
  );
}

export function formatPrice(value: string): string {
  return formatMoney(value, 'Precio por confirmar');
}

export function productPrice(product: CatalogProduct): string | null {
  const prices =
    product.variants
      ?.filter(
        (variant) =>
          variant.status === 'ACTIVE' &&
          variant.salePrice !== null &&
          variant.salePrice !== undefined &&
          String(variant.salePrice).trim() !== ''
      )
      .map((variant) => Number(variant.salePrice))
      .filter(Number.isFinite) ?? [];
  if (!prices.length) return null;
  const lowest = Math.min(...prices);
  return `${product.allowsCustomization || new Set(prices).size > 1 ? 'Desde ' : ''}${formatPrice(String(lowest))}`;
}

export function hasAvailability(product: CatalogProduct): boolean | undefined {
  const variants = product.variants?.filter((variant) => variant.status === 'ACTIVE');
  if (!variants?.length) return undefined;
  const availability = variants.map(
    (variant) =>
      variant.availability ??
      (variant.quantityOnHand !== undefined && variant.quantityReserved !== undefined
        ? variant.quantityOnHand - variant.quantityReserved
        : undefined)
  );
  if (availability.some((value) => (value ?? 0) > 0)) return true;
  if (availability.some((value) => value === undefined)) return undefined;
  return availability.some((value) => (value ?? 0) > 0);
}
