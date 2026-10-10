export function formNumber(value: FormDataEntryValue | null): number | null {
  if (value === null || (typeof value === 'string' && value.trim() === '')) return null;
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
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
  const page = Number(filters.page);
  if (Number.isSafeInteger(page) && page > 1) params.set('page', String(page));
  return params.toString();
}

// An omitted cost is permission-protected and must survive unrelated form edits.
export function variantCostPatch(variant: { estimatedCost?: string | null } | null, value: number | null) {
  return variant && !Object.prototype.hasOwnProperty.call(variant, 'estimatedCost')
    ? {}
    : { estimatedCost: value };
}
