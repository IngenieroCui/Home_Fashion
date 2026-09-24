import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CatalogAdminService } from './catalog-admin.service';

function instance<T extends object>(value: T) {
  return { ...value, get: () => ({ ...value }), update: jest.fn(async (patch) => Object.assign(value, patch)), destroy: jest.fn() };
}

describe('CatalogAdminService', () => {
  const categories = { findByPk: jest.fn(), findOne: jest.fn(), create: jest.fn(), findAndCountAll: jest.fn() };
  const products = { findByPk: jest.fn(), findOne: jest.fn(), create: jest.fn(), findAndCountAll: jest.fn() };
  const variants = { findByPk: jest.fn(), findOne: jest.fn(), create: jest.fn() };
  const images = { findByPk: jest.fn(), create: jest.fn(), update: jest.fn(), sequelize: { transaction: jest.fn(async (callback) => callback({})) } };
  const cloudinary = { destroy: jest.fn() };
  const service = new CatalogAdminService(categories as never, products as never, variants as never, images as never, cloudinary as never);

  beforeEach(() => jest.clearAllMocks());

  it('creates a category with an automatic slug', async () => {
    categories.findOne.mockResolvedValue(null);
    categories.create.mockResolvedValue(instance({ id: '1', name: 'Sofás', slug: 'sofas', isActive: true }));
    await expect(service.createCategory({ name: 'Sofás' })).resolves.toMatchObject({ slug: 'sofas' });
  });

  it('rejects a duplicate slug', async () => {
    categories.findOne.mockResolvedValue({ id: 'other' });
    await expect(service.createCategory({ name: 'Sofás' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('creates a product only for an existing category', async () => {
    categories.findByPk.mockResolvedValue(null);
    await expect(service.createProduct({ categoryId: '9', name: 'Mesa', description: 'Roble', allowsCustomization: false, status: 'ACTIVE' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates a product after checking its category and slug', async () => {
    categories.findByPk.mockResolvedValue({ id: '9' });
    products.findOne.mockResolvedValue(null);
    products.create.mockResolvedValue(instance({ id: '2', categoryId: '9', slug: 'mesa', name: 'Mesa' }));
    await expect(service.createProduct({ categoryId: '9', name: 'Mesa', description: 'Roble', allowsCustomization: false, status: 'ACTIVE' })).resolves.toMatchObject({ slug: 'mesa' });
  });

  it('normalizes SKU and preserves nullable estimated cost', async () => {
    products.findByPk.mockResolvedValue({ id: '2' });
    variants.findOne.mockResolvedValue(null);
    variants.create.mockResolvedValue(instance({ id: '3', sku: 'MESA-01', estimatedCost: null, quantityOnHand: 2, quantityReserved: 0 }));
    const result = await service.createVariant('2', { sku: ' mesa 01 ', salePrice: 120000, estimatedCost: null, quantityOnHand: 2, status: 'ACTIVE' });
    expect(result).toMatchObject({ sku: 'MESA-01', estimatedCost: null });
    expect(variants.create).toHaveBeenCalledWith(expect.objectContaining({ estimatedCost: null }));
  });

  it('rejects duplicate SKU and invalid inventory', async () => {
    products.findByPk.mockResolvedValue({ id: '2' });
    variants.findOne.mockResolvedValue({ id: 'other' });
    await expect(service.createVariant('2', { sku: 'MESA-01', salePrice: 1, quantityOnHand: 1, status: 'ACTIVE' })).rejects.toBeInstanceOf(ConflictException);
    variants.findOne.mockResolvedValue(null);
    await expect(service.createVariant('2', { sku: 'MESA-01', salePrice: 1, quantityOnHand: 1, quantityReserved: 2, status: 'ACTIVE' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an image variant from another product', async () => {
    products.findByPk.mockResolvedValue({ id: '2' });
    variants.findByPk.mockResolvedValue({ id: '3', productId: 'other' });
    await expect(service.createImage('2', { productVariantId: '3', url: 'https://example.test/image.jpg' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('changes the primary image inside a transaction', async () => {
    images.findByPk.mockResolvedValue(instance({ id: '7', productId: '2', productVariantId: null, isPrimary: false }));
    await service.updateImage('7', { isPrimary: true });
    expect(images.sequelize.transaction).toHaveBeenCalled();
    expect(images.update).toHaveBeenCalledWith({ isPrimary: false }, expect.objectContaining({ where: { productId: '2', productVariantId: null } }));
  });

  it('allows a product to be deactivated', async () => {
    const product = instance({ id: '2', name: 'Mesa', status: 'ACTIVE' });
    products.findByPk.mockResolvedValue(product);
    await expect(service.updateProduct('2', { status: 'INACTIVE' })).resolves.toMatchObject({ status: 'INACTIVE' });
  });
});
