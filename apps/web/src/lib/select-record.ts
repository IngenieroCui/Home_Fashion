/** HTML select values are strings, even when MySQL returns numeric identifiers. */
export function normalizeSelectRecord<T extends { id: string; variants?: { id: string }[] }>(
  record: T
): T {
  return {
    ...record,
    id: String(record.id),
    ...(record.variants
      ? { variants: record.variants.map((variant) => ({ ...variant, id: String(variant.id) })) }
      : {})
  };
}
