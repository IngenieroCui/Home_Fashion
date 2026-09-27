import { NotFoundException } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { CatalogStatus } from './catalog.types';

describe('CatalogService', () => {
  const categoryModel = { findAll: jest.fn() };
  const productModel = {
    findAndCountAll: jest.fn(),
    findOne: jest.fn(),
    sequelize: { literal: jest.fn((value: string) => value) }
  };
  const service = new CatalogService(categoryModel as never, productModel as never);

  beforeEach(() => jest.clearAllMocks());

  it('returns a paginated product list without estimated costs', async () => {
    productModel.findAndCountAll.mockResolvedValue({
      count: 13,
      rows: [
        {
          get: () => ({
            slug: 'sofa-verona',
            variants: [{ sku: 'VER-3P-GRI', quantityOnHand: 4, quantityReserved: 1 }]
          })
        }
      ]
    });
    const result = await service.listProducts({ page: 2, limit: 5 });
    expect(result.pagination).toEqual({ page: 2, limit: 5, total: 13, totalPages: 3 });
    expect(JSON.stringify(productModel.findAndCountAll.mock.calls[0][0])).not.toContain(
      'estimatedCost'
    );
    expect(result.data[0]).toMatchObject({ variants: [{ availability: 3 }] });
    expect(JSON.stringify(result.data[0])).not.toContain('quantityOnHand');
    expect(JSON.stringify(result.data[0])).not.toContain('quantityReserved');
    expect(JSON.stringify(productModel.findAndCountAll.mock.calls[0][0])).not.toContain('location');
  });

  it('filters searches and category slugs', async () => {
    productModel.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });
    await service.listProducts({ page: 1, limit: 12, q: 'Verona', category: 'sofas' });
    const options = productModel.findAndCountAll.mock.calls[0][0];
    expect(options.where.status).toBe(CatalogStatus.ACTIVE);
    expect(options.include[0].where).toEqual({ slug: 'sofas', isActive: true });
    expect(options.where[Object.getOwnPropertySymbols(options.where)[0]]).toHaveLength(2);
  });

  it('requires a variant with available inventory when requested', async () => {
    productModel.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });
    await service.listProducts({ page: 1, limit: 12, inStock: true });
    const variant = productModel.findAndCountAll.mock.calls[0][0].include[1];
    expect(variant.required).toBe(true);
    expect(productModel.sequelize.literal).toHaveBeenCalled();
  });

  it('returns a product detail with calculated availability', async () => {
    productModel.findOne.mockResolvedValue({
      get: () => ({
        slug: 'sofa-verona',
        variants: [{ sku: 'VER-3P-GRI', quantityOnHand: 4, quantityReserved: 1 }]
      })
    });
    const result = await service.getProductBySlug('sofa-verona');
    expect(result).toMatchObject({ variants: [{ sku: 'VER-3P-GRI', availability: 3 }] });
    expect(JSON.stringify(result)).not.toContain('estimatedCost');
  });

  it('does not retrieve an inactive product from the public service', async () => {
    productModel.findOne.mockResolvedValue(null);
    await expect(service.getProductBySlug('mesa-inactiva')).rejects.toBeInstanceOf(
      NotFoundException
    );
    expect(productModel.findOne.mock.calls[0][0].where).toEqual({
      slug: 'mesa-inactiva',
      status: CatalogStatus.ACTIVE
    });
  });

  it('throws 404 for an absent product', async () => {
    productModel.findOne.mockResolvedValue(null);
    await expect(service.getProductBySlug('missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});
