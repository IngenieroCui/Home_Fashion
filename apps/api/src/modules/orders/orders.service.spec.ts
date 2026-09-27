import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CreateOrderFromSaleDto } from './dto/orders.dto';
import { OrdersService } from './orders.service';
import { OrderSupplyType } from './orders.types';

describe('OrdersService', () => {
  const dto = (items: CreateOrderFromSaleDto['items'], overrides: Partial<CreateOrderFromSaleDto> = {}): CreateOrderFromSaleDto => ({ items, ...overrides });
  const stock = (saleItemId: string, notes?: string) => ({ saleItemId, supplyType: OrderSupplyType.IN_STOCK, notes });
  const made = (saleItemId: string, notes?: string) => ({ saleItemId, supplyType: OrderSupplyType.MADE_TO_ORDER, notes });
  function setup(options: { sale?: Record<string, unknown> | null; existingOrder?: unknown; permissions?: string[]; variants?: Array<Record<string, unknown>> } = {}) {
    const transaction = { LOCK: { UPDATE: 'UPDATE' } };
    const items = [
      { id: '10', saleId: '1', productId: '100', productVariantId: '20', productNameSnapshot: 'Sofá histórico', variantNameSnapshot: 'Gris', skuSnapshot: 'SOF-GRI', customization: null, quantity: 1, notes: 'Primero' },
      { id: '11', saleId: '1', productId: '100', productVariantId: '20', productNameSnapshot: 'Sofá histórico', variantNameSnapshot: 'Gris', skuSnapshot: 'SOF-GRI', customization: { fabric: 'Lino' }, quantity: 2, notes: null }
    ];
    const sale = options.sale === undefined ? { id: '1', customerId: 'customer-1', status: 'CONFIRMED', items } : options.sale;
    const variantRows = (options.variants ?? [{ id: '20', quantityOnHand: 5, quantityReserved: 1 }]).map((source) => {
      const variant = { ...source, update: jest.fn(async (values) => Object.assign(variant, values)) };
      return variant;
    });
    const createdOrders: Array<{ update: jest.Mock }> = [];
    const orders = {
      sequelize: { transaction: jest.fn(async (callback) => callback(transaction)) },
      findOne: jest.fn().mockResolvedValue(options.existingOrder ?? null),
      create: jest.fn(async (values) => {
        const order = { ...values, id: '7', update: jest.fn(async (update) => Object.assign(order, update)) };
        createdOrders.push(order);
        return order;
      }),
      findByPk: jest.fn(async (id) => ({ get: () => ({ id, code: 'HF-PED-2026-00007', items: [] }) })),
      findAndCountAll: jest.fn().mockResolvedValue({ rows: [], count: 0 })
    };
    const orderItems = { bulkCreate: jest.fn().mockResolvedValue([]), findAll: jest.fn().mockResolvedValue([]) };
    const sales = { findByPk: jest.fn().mockResolvedValue(sale) };
    const saleItems = { findByPk: jest.fn().mockResolvedValue(null) };
    const variants = { findAll: jest.fn().mockResolvedValue(variantRows) };
    const service = new OrdersService(orders as never, orderItems as never, sales as never, saleItems as never, variants as never, { getAuthenticatedUser: jest.fn().mockResolvedValue({ permissions: options.permissions ?? ['ORDER_MANAGE'] }) } as never);
    return { service, orders, orderItems, sales, saleItems, variants, variantRows, createdOrders };
  }

  it('creates an OPEN order from a confirmed sale, preserves snapshots and generates its code from the id', async () => {
    const { service, orders, orderItems, variantRows, createdOrders } = setup();
    await service.createFromSale('1', dto([stock('10'), made('11')], { promisedDate: '2026-09-15', notes: 'Todo junto' }), 'user-1');
    expect(orders.create).toHaveBeenCalledWith(expect.objectContaining({ saleId: '1', status: 'OPEN', promisedDate: '2026-09-15' }), expect.anything());
    expect(createdOrders[0].update).toHaveBeenCalledWith({ code: 'HF-PED-2026-00007' }, expect.anything());
    expect(orderItems.bulkCreate).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ saleItemId: '10', productNameSnapshot: 'Sofá histórico', status: 'RESERVED' }),
      expect.objectContaining({ saleItemId: '11', customization: { fabric: 'Lino' }, status: 'PENDING_PRODUCTION' })
    ]), expect.anything());
    expect(variantRows[0].update).toHaveBeenCalledWith({ quantityReserved: 2 }, expect.anything());
  });

  it('matches numeric MySQL ids with string ids from the HTTP request', async () => {
    const sale = { id: 1, customerId: 1, status: 'CONFIRMED', items: [
      { id: 10, saleId: 1, productId: 100, productVariantId: 20, productNameSnapshot: 'Sofá', variantNameSnapshot: 'Gris', skuSnapshot: 'SOF-GRI', customization: null, quantity: 1, notes: null }
    ] };
    const { service, variantRows } = setup({ sale, variants: [{ id: 20, quantityOnHand: 2, quantityReserved: 0 }] });
    await expect(service.createFromSale('1', dto([stock('10')]), 'user-1')).resolves.toBeDefined();
    expect(variantRows[0].update).toHaveBeenCalledWith({ quantityReserved: 1 }, expect.anything());
  });

  it.each([
    ['rejects a missing sale', { sale: null }, NotFoundException],
    ['rejects a non-confirmed sale', { sale: { id: '1', status: 'CANCELLED', items: [] } }, BadRequestException],
    ['rejects an already converted sale', { existingOrder: { id: 'order' } }, ConflictException],
    ['rejects a sale with no items', { sale: { id: '1', customerId: 'customer-1', status: 'CONFIRMED', items: [] } }, BadRequestException]
  ])('%s', async (_name, options, exception) => {
    const { service } = setup(options);
    await expect(service.createFromSale('1', dto([]), 'user-1')).rejects.toBeInstanceOf(exception);
  });

  it.each([
    ['rejects omitted sale items', dto([stock('10')])],
    ['rejects duplicate sale items', dto([stock('10'), made('10')])]
  ])('%s', async (_name, input) => {
    const { service } = setup();
    await expect(service.createFromSale('1', input, 'user-1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a sale item from another sale and a nonexistent sale item', async () => {
    const other = setup();
    other.saleItems.findByPk.mockResolvedValue({ id: '99', saleId: '2' });
    await expect(other.service.createFromSale('1', dto([stock('10'), stock('99')]), 'user-1')).rejects.toBeInstanceOf(BadRequestException);
    const missing = setup();
    await expect(missing.service.createFromSale('1', dto([stock('10'), stock('99')]), 'user-1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('aggregates a shared IN_STOCK variant, locks it and leaves quantityOnHand unchanged', async () => {
    const { service, variants, variantRows } = setup();
    await service.createFromSale('1', dto([stock('10'), stock('11')]), 'user-1');
    expect(variants.findAll).toHaveBeenCalledWith(expect.objectContaining({ lock: 'UPDATE', order: [['id', 'ASC']] }));
    expect(variantRows[0].update).toHaveBeenCalledWith({ quantityReserved: 4 }, expect.anything());
    expect(variantRows[0]).toEqual(expect.objectContaining({ quantityOnHand: 5 }));
  });

  it('aggregates five units for one variant and reaches the expected reserved quantity', async () => {
    const sale = { id: '1', customerId: 'customer-1', status: 'CONFIRMED', items: [
      { id: '10', saleId: '1', productId: '100', productVariantId: '20', productNameSnapshot: 'A', variantNameSnapshot: null, skuSnapshot: 'A', customization: null, quantity: 2, notes: null },
      { id: '11', saleId: '1', productId: '100', productVariantId: '20', productNameSnapshot: 'B', variantNameSnapshot: null, skuSnapshot: 'B', customization: null, quantity: 3, notes: null }
    ] };
    const { service, variantRows } = setup({ sale, variants: [{ id: '20', quantityOnHand: 12, quantityReserved: 4 }] });
    await service.createFromSale('1', dto([stock('10'), stock('11')]), 'user-1');
    expect(variantRows[0].update).toHaveBeenCalledWith({ quantityReserved: 9 }, expect.anything());
  });

  it('allows an exact availability limit without changing quantityOnHand', async () => {
    const { service, variantRows } = setup({ variants: [{ id: '20', quantityOnHand: 4, quantityReserved: 1 }] });
    await expect(service.createFromSale('1', dto([stock('10'), stock('11')]), 'user-1')).resolves.toBeDefined();
    expect(variantRows[0].update).toHaveBeenCalledWith({ quantityReserved: 4 }, expect.anything());
    expect(variantRows[0].quantityOnHand).toBe(4);
  });

  it('does not reserve inventory for MADE_TO_ORDER and allows a customization without a variant only for it', async () => {
    const noVariantSale = { id: '1', customerId: 'customer-1', status: 'CONFIRMED', items: [
      { id: '10', saleId: '1', productId: '100', productVariantId: null, productNameSnapshot: 'Sofá personalizado', variantNameSnapshot: null, skuSnapshot: null, customization: { fabric: 'Azul' }, quantity: 1, notes: null }
    ] };
    const madeToOrder = setup({ sale: noVariantSale });
    await expect(madeToOrder.service.createFromSale('1', dto([made('10')]), 'user-1')).resolves.toBeDefined();
    expect(madeToOrder.variants.findAll).not.toHaveBeenCalled();
    const inStock = setup({ sale: noVariantSale });
    await expect(inStock.service.createFromSale('1', dto([stock('10')]), 'user-1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects insufficient inventory before creating the order, leaving no partial reservation', async () => {
    const { service, orders, orderItems, variantRows } = setup({ variants: [{ id: '20', quantityOnHand: 2, quantityReserved: 1 }] });
    await expect(service.createFromSale('1', dto([stock('10'), stock('11')]), 'user-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(variantRows[0].update).not.toHaveBeenCalled();
    expect(orders.create).not.toHaveBeenCalled();
    expect(orderItems.bulkCreate).not.toHaveBeenCalled();
  });

  it('validates all locked variants before updating any reservation', async () => {
    const sale = { id: '1', customerId: 'customer-1', status: 'CONFIRMED', items: [
      { id: '10', saleId: '1', productId: '100', productVariantId: '20', productNameSnapshot: 'A', variantNameSnapshot: null, skuSnapshot: 'A', customization: null, quantity: 1, notes: null },
      { id: '11', saleId: '1', productId: '101', productVariantId: '30', productNameSnapshot: 'B', variantNameSnapshot: null, skuSnapshot: 'B', customization: null, quantity: 2, notes: null }
    ] };
    const { service, variants, variantRows } = setup({ sale, variants: [
      { id: '20', quantityOnHand: 5, quantityReserved: 0 },
      { id: '30', quantityOnHand: 1, quantityReserved: 0 }
    ] });
    await expect(service.createFromSale('1', dto([stock('10'), stock('11')]), 'user-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(variants.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: { id: ['20', '30'] }, transaction: expect.anything(), lock: 'UPDATE' }));
    expect(variantRows[0].update).not.toHaveBeenCalled();
    expect(variantRows[1].update).not.toHaveBeenCalled();
  });

  it('uses a transaction and an UPDATE lock on the sale', async () => {
    const { service, orders, sales, variants, orderItems, createdOrders } = setup();
    await service.createFromSale('1', dto([stock('10'), made('11')]), 'user-1');
    expect(orders.sequelize.transaction).toHaveBeenCalledTimes(1);
    expect(sales.findByPk).toHaveBeenCalledWith('1', expect.objectContaining({ lock: 'UPDATE' }));
    expect(orders.findOne).toHaveBeenCalledWith(expect.objectContaining({ transaction: expect.anything() }));
    expect(variants.findAll).toHaveBeenCalledWith(expect.objectContaining({ transaction: expect.anything(), lock: 'UPDATE' }));
    expect(createdOrders[0].update).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ transaction: expect.anything() }));
    expect(orderItems.bulkCreate).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ transaction: expect.anything() }));
  });

  it('requires ORDER_MANAGE', async () => {
    const { service } = setup({ permissions: [] });
    await expect(service.createFromSale('1', dto([stock('10'), made('11')]), 'user-1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('lists a page and obtains item totals with one grouped query', async () => {
    const { service, orders, orderItems } = setup();
    orders.findAndCountAll.mockResolvedValue({ rows: [{ id: '7', get: () => ({ id: '7', code: 'HF-PED-2026-00007' }) }], count: 1 });
    orderItems.findAll.mockResolvedValue([{ get: () => ({ orderId: '7', totalItems: '5' }) }]);
    await expect(service.list({ page: 1, limit: 12 }, 'user-1')).resolves.toMatchObject({ data: [expect.objectContaining({ totalItems: 5 })] });
    expect(orderItems.findAll).toHaveBeenCalledTimes(1);
    expect(orderItems.findAll).toHaveBeenCalledWith(expect.objectContaining({ group: ['order_id'] }));
    expect(orderItems.findAll.mock.calls[0][0].attributes[1][0]).toEqual(expect.objectContaining({ fn: 'SUM' }));
  });

  it('returns detail through the concrete order query with its items', async () => {
    const { service, orders } = setup();
    orders.findByPk.mockResolvedValue({ get: () => ({ id: '7', items: [{ id: '1', supplyType: 'IN_STOCK' }] }) });
    await expect(service.detail('7')).resolves.toEqual({ id: '7', items: [{ id: '1', supplyType: 'IN_STOCK' }] });
    expect(orders.findByPk).toHaveBeenCalledWith('7', expect.objectContaining({ include: expect.any(Array) }));
  });

  it('includes a nullable workshopJob summary with its assigned workshop in the single order detail query', async () => {
    const { service, orders } = setup();
    orders.findByPk.mockResolvedValue({ get: () => ({ id: '7', items: [
      { id: '1', workshopJob: null },
      { id: '2', workshopJob: { id: '8', code: 'HF-TAL-2026-00008', status: 'ASSIGNED', expectedCompletionDate: '2026-09-20', workshopUser: { id: '3', fullName: 'Taller Uno' } } }
    ] }) });
    await expect(service.detail('7')).resolves.toMatchObject({ items: [
      { id: '1', workshopJob: null },
      { id: '2', workshopJob: expect.objectContaining({ code: 'HF-TAL-2026-00008', workshopUser: { id: '3', fullName: 'Taller Uno' } }) }
    ] });
    const itemInclude = orders.findByPk.mock.calls[0][1].include.find((entry) => entry.model.name === 'OrderItem');
    expect(itemInclude.include).toEqual(expect.arrayContaining([expect.objectContaining({ attributes: ['id', 'code', 'status', 'expectedCompletionDate'] })]));
  });
});
