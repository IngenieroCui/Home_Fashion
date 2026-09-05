import { up } from './20260804154500-seed-catalog-development';

describe('development catalog seed', () => {
  it('starts with coherent local demo inventory and no external image dependency', async () => {
    const bulkInsert = jest.fn();
    await up({
      context: {
        sequelize: {
          transaction: async (callback: (transaction: unknown) => unknown) => callback({})
        },
        bulkInsert
      }
    } as never);

    const variants = bulkInsert.mock.calls.find(([table]) => table === 'product_variants')?.[1] as
      | Array<{ quantity_on_hand: number; quantity_reserved: number }>
      | undefined;

    expect(variants).toBeDefined();
    expect(variants?.some((variant) => variant.quantity_on_hand > 0)).toBe(true);
    expect(variants?.every((variant) => variant.quantity_reserved === 0)).toBe(true);
    expect(bulkInsert.mock.calls.some(([table]) => table === 'product_images')).toBe(false);
  });
});
