export function safePanelPath(value: string | null): string {
  if (!value || /[\\\u0000-\u001f\u007f]/.test(value)) return '/panel';
  const base = 'https://home-fashion.invalid';
  try {
    const url = new URL(value, base);
    if (url.origin !== base || !(url.pathname === '/panel' || url.pathname.startsWith('/panel/')))
      return '/panel';
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '/panel';
  }
}
