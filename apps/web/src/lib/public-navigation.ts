export function activePublicHref(
  pathname: string,
  search: { get: (name: string) => string | null }
) {
  if (pathname !== '/catalogo') return pathname;
  if (search.get('allowsCustomization') === 'true') return '/catalogo?allowsCustomization=true';
  if (search.get('inStock') === 'true') return '/catalogo?inStock=true';
  return '/catalogo';
}
