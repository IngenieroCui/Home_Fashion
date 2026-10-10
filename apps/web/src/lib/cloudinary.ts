function deliveryUrl(url: string): URL | null {
  try {
    const parsed = new URL(url);
    const marker = '/image/upload/';
    const offset = parsed.pathname.indexOf(marker);
    if (
      parsed.hostname !== 'res.cloudinary.com' ||
      offset < 0 ||
      !['http:', 'https:'].includes(parsed.protocol)
    )
      return null;
    if (parsed.pathname.slice(offset + marker.length).startsWith('s--')) return null;
    return parsed;
  } catch {
    return null;
  }
}
export function cloudinaryImageUrl(
  url: string,
  {
    width,
    quality = 'auto',
    format = 'auto'
  }: { width: number; quality?: string | number; format?: string }
) {
  const parsed = deliveryUrl(url);
  if (!parsed || !Number.isFinite(width) || width < 1) return url;
  const marker = '/image/upload/';
  const offset = parsed.pathname.indexOf(marker) + marker.length;
  parsed.pathname = `${parsed.pathname.slice(0, offset)}w_${Math.round(width)},c_limit,q_${quality},f_${format}/${parsed.pathname.slice(offset)}`;
  return parsed.toString();
}
export function cloudinarySrcSet(url: string, widths: readonly number[]): string | undefined {
  if (!deliveryUrl(url)) return undefined;
  const valid = [
    ...new Set(widths.filter((width) => Number.isFinite(width) && width >= 1).map(Math.round))
  ].sort((a, b) => a - b);
  return valid.length
    ? valid.map((width) => `${cloudinaryImageUrl(url, { width })} ${width}w`).join(', ')
    : undefined;
}
