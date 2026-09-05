import { resolveSlug, slugify } from './slug.util';

describe('slug utilities', () => {
  it('normalizes names into URL-safe slugs', () => {
    expect(slugify('  Sofá Línea Áurea!  ')).toBe('sofa-linea-aurea');
    expect(resolveSlug('Mesa de noche')).toBe('mesa-de-noche');
  });

  it('rejects a slug without usable characters', () => {
    expect(() => resolveSlug('***')).toThrow('Slug must contain letters or numbers');
  });
});
