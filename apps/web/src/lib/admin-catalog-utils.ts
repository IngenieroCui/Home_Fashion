export function formNumber(value: FormDataEntryValue | null): number | null {
  if (value === null || value === '') return null;
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
  if (filters.page && Number(filters.page) > 1) params.set('page', filters.page);
  return params.toString();
}
