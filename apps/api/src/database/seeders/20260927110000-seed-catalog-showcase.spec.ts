import { up } from './20260927110000-seed-catalog-showcase';

describe('showcase catalog seed', () => {
  it('adds only missing demo products and preserves an owner-uploaded image', async () => {
    const ids = new Map([
      ['sofas', 1],
      ['comedores', 2],
      ['dormitorios', 3],
      ['sofa-verona', 1],
      ['comedor-siena', 2],
      ['cama-napoles', 3]
    ]);
    const inserted: Record<string, Array<Record<string, unknown>>> = {};
    let nextId = 4;
    const context = {
      sequelize: {
        transaction: async (callback: (transaction: object) => Promise<void>) => callback({}),
        query: jest.fn(
          async (
            sql: string,
            options: { replacements: { value?: string; productId?: number } }
          ) => {
            if (sql.includes('FROM product_images'))
              return options.replacements.productId === 1 ? [{ id: 99 }] : [];
            const id = ids.get(options.replacements.value ?? '');
            return id ? [{ id }] : [];
          }
        )
      },
      bulkInsert: jest.fn(async (table: string, rows: Array<Record<string, unknown>>) => {
        inserted[table] ??= [];
        inserted[table].push(...rows);
        if (table === 'products') {
          for (const row of rows) ids.set(String(row.slug), nextId++);
        }
      })
    };
    const previous = process.env.CATALOG_ASSET_BASE_URL;
    process.env.CATALOG_ASSET_BASE_URL = 'https://home-fashion-web-five.vercel.app';
    try {
      await up({ context: context as never });
    } finally {
      if (previous === undefined) delete process.env.CATALOG_ASSET_BASE_URL;
      else process.env.CATALOG_ASSET_BASE_URL = previous;
    }

    expect(inserted.products).toHaveLength(6);
    expect(inserted.product_variants).toHaveLength(6);
    expect(inserted.product_variants.every((row) => row.quantity_on_hand === 0)).toBe(true);
    expect(inserted.product_images).toHaveLength(8);
    expect(inserted.product_images.some((row) => row.product_id === 1)).toBe(false);
    expect(
      inserted.product_images.every((row) =>
        String(row.url).startsWith('https://home-fashion-web-five.vercel.app/catalog/')
      )
    ).toBe(true);
  });
});
