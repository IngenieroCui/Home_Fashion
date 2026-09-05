export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function resolveSlug(name: string, slug?: string): string {
  const normalized = slugify(slug ?? name);
  if (!normalized) throw new Error('Slug must contain letters or numbers');
  return normalized;
}
