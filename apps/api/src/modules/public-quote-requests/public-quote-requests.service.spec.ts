import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { CatalogStatus } from '../catalog/catalog.types';
import { QuoteStatus } from '../quotes/quotes.types';
import { PublicQuoteRequestsService } from './public-quote-requests.service';

describe('PublicQuoteRequestsService', () => {
  const transaction = { LOCK: { SHARE: 'SHARE', UPDATE: 'UPDATE' } };
  const customers = { create: jest.fn() };
  const items = { create: jest.fn() };
  const products = { findOne: jest.fn() };
  const variants = { findOne: jest.fn() };
  const quote = {
    id: '42',
    code: 'PENDING',
    update: jest.fn(async function (this: { code: string }, values: { code: string }) {
      this.code = values.code;
    })
  };
  const quotes = {
    sequelize: {
      transaction: jest.fn((callback: (value: typeof transaction) => unknown) =>
        callback(transaction)
      )
    },
    findOne: jest.fn(),
    create: jest.fn()
  };
  const service = new PublicQuoteRequestsService(
    customers as never,
    quotes as never,
    items as never,
    products as never,
    variants as never,
    { resolvePrimaryImageUrl: jest.fn().mockResolvedValue(null) } as never
  );
  const dto = {
    requestId: '19d4bcf0-4307-4b1c-b3f4-61d2ecafdcec',
    fullName: 'Ana Pérez',
    phone: '3001234567',
    email: 'ana@example.com',
    productId: '10',
    productVariantId: '20',
    quantity: 2,
    customization: { color: 'Arena', details: '' },
    message: 'Entrega en Ibagué'
  };
  const hashFor = (value = dto) =>
    createHash('sha256')
      .update(
        JSON.stringify({
          fullName: value.fullName,
          phone: value.phone,
          email: value.email ?? null,
          productId: value.productId,
          productVariantId: value.productVariantId ?? null,
          quantity: value.quantity,
          customization: value.customization
            ? {
                dimensions: null,
                material: null,
                fabric: null,
                color: value.customization.color ?? null,
                finish: null,
                details: value.customization.details || null
              }
            : null,
          message: value.message ?? null
        })
      )
      .digest('hex');

  beforeEach(() => {
    jest.clearAllMocks();
    quote.code = 'PENDING';
    quotes.findOne.mockResolvedValue(null);
    products.findOne.mockResolvedValue({
      id: '10',
      name: 'Sofá Verona',
      allowsCustomization: true
    });
    variants.findOne.mockResolvedValue({
      id: '20',
      productId: '10',
      name: 'Tres puestos',
      sku: 'VER-3P',
      salePrice: '1250000.50'
    });
    customers.create.mockResolvedValue({ id: '30' });
    quotes.create.mockResolvedValue(quote);
    items.create.mockResolvedValue({ id: '50' });
  });

  it('retries a rolled-back deadlock with the same idempotency key and replays the winner', async () => {
    quotes.sequelize.transaction.mockRejectedValueOnce({ parent: { code: 'ER_LOCK_DEADLOCK' } });
    quotes.findOne.mockResolvedValue({ code: 'QA-WINNER', publicRequestPayloadHash: hashFor() });
    await expect(service.create(dto)).resolves.toMatchObject({ requestCode: 'QA-WINNER' });
    expect(quotes.sequelize.transaction).toHaveBeenCalledTimes(2);
    expect(customers.create).not.toHaveBeenCalled();
  });

  it('limits retries and returns a controlled conflict on repeated lock errors', async () => {
    for (let i = 0; i < 3; i++) quotes.sequelize.transaction.mockRejectedValueOnce({ parent: { code: 'ER_LOCK_WAIT_TIMEOUT' } });
    await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException);
    expect(quotes.sequelize.transaction).toHaveBeenCalledTimes(3);
  });

  it('rejects a catalog-price request whose total would overflow the database', async () => {
    variants.findOne.mockResolvedValue({ id: '20', productId: '10', salePrice: '9999999999.99' });
    await expect(service.create(dto)).rejects.toBeInstanceOf(BadRequestException);
    expect(quotes.create).not.toHaveBeenCalled();
  });

  it('creates a REQUESTED quote and historical item snapshots using the backend catalog price', async () => {
    await expect(service.create(dto)).resolves.toEqual({
      received: true,
      requestCode: 'HF-SOL-2026-00042',
      status: QuoteStatus.REQUESTED
    });
    expect(products.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: '10', status: CatalogStatus.ACTIVE }, lock: 'SHARE' })
    );
    expect(variants.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: '20', status: CatalogStatus.ACTIVE }, lock: 'SHARE' })
    );
    expect(quotes.create).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: '30',
        publicRequestKey: dto.requestId,
        publicRequestPayloadHash: hashFor(),
        status: QuoteStatus.REQUESTED,
        customerNotes: 'Entrega en Ibagué',
        subtotal: '2500001.00',
        total: '2500001.00',
        createdByUserId: null,
        updatedByUserId: null
      }),
      { transaction }
    );
    expect(items.create).toHaveBeenCalledWith(
      expect.objectContaining({
        productNameSnapshot: 'Sofá Verona',
        variantNameSnapshot: 'Tres puestos',
        skuSnapshot: 'VER-3P',
        unitListPrice: '1250000.50',
        unitQuotedPrice: '1250000.50',
        subtotal: '2500001.00',
        customization: { color: 'Arena' }
      }),
      { transaction }
    );
  });

  it('formats a numeric MySQL auto-increment id in the public request code', async () => {
    quote.id = 42 as never;
    await expect(service.create(dto)).resolves.toMatchObject({
      requestCode: 'HF-SOL-2026-00042'
    });
  });

  it('creates a distinct public customer for each new requestId even when contact matches', async () => {
    await service.create(dto);
    await service.create({ ...dto, requestId: '7a1af82f-ad64-4fb8-a5c8-92b76b35cfee' });
    expect(customers.create).toHaveBeenCalledTimes(2);
    expect(quotes.create).toHaveBeenCalledTimes(2);
  });

  it('creates a public customer with nullable audit when no safe exact match exists', async () => {
    await service.create({ ...dto, email: undefined });
    expect(customers.create).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: dto.fullName,
        phone: dto.phone,
        email: null,
        isActive: true,
        createdByUserId: null,
        updatedByUserId: null
      }),
      { transaction }
    );
  });

  it('does not create anything when the active product is absent', async () => {
    products.findOne.mockResolvedValue(null);
    await expect(service.create(dto)).rejects.toBeInstanceOf(NotFoundException);
    expect(variants.findOne).not.toHaveBeenCalled();
    expect(quotes.create).not.toHaveBeenCalled();
  });

  it('does not create anything when the active variant is absent', async () => {
    variants.findOne.mockResolvedValue(null);
    await expect(service.create(dto)).rejects.toBeInstanceOf(NotFoundException);
    expect(quotes.create).not.toHaveBeenCalled();
  });

  it('rejects a variant that belongs to another product', async () => {
    variants.findOne.mockResolvedValue({ id: '20', productId: '999', salePrice: '1.00' });
    await expect(service.create(dto)).rejects.toBeInstanceOf(BadRequestException);
    expect(quotes.create).not.toHaveBeenCalled();
  });

  it('rejects customization for a product that does not allow it', async () => {
    products.findOne.mockResolvedValue({
      id: '10',
      name: 'Sofá Verona',
      allowsCustomization: false
    });
    await expect(service.create(dto)).rejects.toBeInstanceOf(BadRequestException);
    expect(variants.findOne).not.toHaveBeenCalled();
    expect(quotes.create).not.toHaveBeenCalled();
  });

  it('creates an unpriced snapshot for a fully customized product without a variant', async () => {
    await expect(service.create({ ...dto, productVariantId: undefined })).resolves.toMatchObject({
      status: QuoteStatus.REQUESTED
    });
    expect(variants.findOne).not.toHaveBeenCalled();
    expect(quotes.create).toHaveBeenCalledWith(
      expect.objectContaining({ subtotal: null, discountTotal: null, total: null }),
      { transaction }
    );
    expect(items.create).toHaveBeenCalledWith(
      expect.objectContaining({
        productVariantId: null,
        productNameSnapshot: 'Sofá Verona',
        variantNameSnapshot: null,
        skuSnapshot: null,
        unitListPrice: null,
        unitQuotedPrice: null,
        subtotal: null
      }),
      { transaction }
    );
  });

  it('requires a variant when the product does not allow customization', async () => {
    products.findOne.mockResolvedValue({
      id: '10',
      name: 'Sofá Verona',
      allowsCustomization: false
    });
    await expect(
      service.create({ ...dto, productVariantId: undefined, customization: undefined })
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(quotes.create).not.toHaveBeenCalled();
  });

  it('returns the original response for an already persisted request key without creating rows', async () => {
    quotes.findOne.mockResolvedValue({
      code: 'HF-SOL-2026-00007',
      publicRequestPayloadHash: hashFor()
    });
    await expect(service.create(dto)).resolves.toEqual({
      received: true,
      requestCode: 'HF-SOL-2026-00007',
      status: QuoteStatus.REQUESTED
    });
    expect(products.findOne).not.toHaveBeenCalled();
    expect(quotes.create).not.toHaveBeenCalled();
    expect(items.create).not.toHaveBeenCalled();
  });

  it('accepts the same canonical payload regardless of customization property order', async () => {
    quotes.findOne.mockResolvedValue({
      code: 'HF-SOL-2026-00007',
      publicRequestPayloadHash: hashFor()
    });
    await expect(
      service.create({ ...dto, customization: { details: '', color: 'Arena' } })
    ).resolves.toMatchObject({ requestCode: 'HF-SOL-2026-00007' });
  });

  it('rejects reuse of requestId with a different normalized payload', async () => {
    quotes.findOne.mockResolvedValue({
      code: 'HF-SOL-2026-00007',
      publicRequestPayloadHash: hashFor()
    });
    await expect(service.create({ ...dto, quantity: 3 })).rejects.toBeInstanceOf(ConflictException);
    expect(customers.create).not.toHaveBeenCalled();
    expect(quotes.create).not.toHaveBeenCalled();
  });

  it('recovers a concurrent duplicate through the unique request key', async () => {
    quotes.create.mockRejectedValueOnce({ name: 'SequelizeUniqueConstraintError' });
    quotes.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({
      code: 'HF-SOL-2026-00008',
      publicRequestPayloadHash: hashFor()
    });
    await expect(service.create(dto)).resolves.toEqual({
      received: true,
      requestCode: 'HF-SOL-2026-00008',
      status: QuoteStatus.REQUESTED
    });
  });

  it('uses a single transaction for customer, quote and item creation', async () => {
    await service.create(dto);
    expect(quotes.sequelize.transaction).toHaveBeenCalledTimes(1);
    for (const call of [
      customers.create.mock.calls[0],
      quotes.create.mock.calls[0],
      items.create.mock.calls[0]
    ]) {
      expect(call[1]).toEqual({ transaction });
    }
  });
});
