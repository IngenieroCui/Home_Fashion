import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { QuoteStatus } from '../quotes/quotes.types';
import { calculatePaymentSummary, calculateSaleItem, calculateSaleTotals } from './sales-calculations';
import { RegisterSalePaymentDto, SaleItemInputDto } from './dto/sales.dto';
import { SalesService } from './sales.service';
import { randomUUID } from 'node:crypto';
import {
  SalePaymentAdjustmentEffect,
  SalePaymentMethod,
  SalePaymentStatus,
  SalePaymentType,
  SaleStatus
} from './sales.types';

describe('SalesService', () => {
  function setup(
    options: {
      permissions?: string[];
      allowsCustomization?: boolean;
      variantProductId?: string;
      listPrice?: string;
      cost?: string | null;
    } = {}
  ) {
    const createdItems: Array<{ subtotal: string; discountAmount: string }> = [];
    const saleItems = {
      create: jest.fn().mockImplementation((values) => {
        createdItems.push(values);
        return Promise.resolve(values);
      }),
      findAll: jest.fn().mockImplementation(() => Promise.resolve(createdItems))
    };
    const salePayments = {
      create: jest.fn().mockImplementation((values) => Promise.resolve({
        ...values,
        id: 'payment-1',
        get: () => ({ ...values, id: 'payment-1' })
      })),
      findAll: jest.fn().mockResolvedValue([]),
      findByPk: jest.fn()
    };
    const sales = {
      sequelize: {
        transaction: jest.fn(async (callback) => callback({ LOCK: { UPDATE: 'UPDATE' } }))
      },
      create: jest.fn().mockImplementation((values) => {
        const sale = {
          ...values,
          id: '1',
          update: jest.fn(async (update): Promise<unknown> => Object.assign(sale, update))
        };
        return Promise.resolve(sale);
      }),
      findOne: jest.fn().mockResolvedValue(null),
      findAndCountAll: jest.fn().mockResolvedValue({ rows: [], count: 0 }),
      findByPk: jest
        .fn()
        .mockResolvedValue({ get: () => ({ id: '1', total: '100.00', items: [] }) })
    };
    const quotes = { findByPk: jest.fn() };
    const products = {
      findByPk: jest.fn().mockResolvedValue({
        id: '10',
        name: 'Sofá',
        allowsCustomization: options.allowsCustomization ?? false
      })
    };
    const variants = {
      findByPk: jest.fn().mockResolvedValue({
        id: '20',
        productId: options.variantProductId ?? '10',
        sku: 'SOF-1',
        name: 'Base',
        salePrice: options.listPrice ?? '100.00',
        estimatedCost: options.cost ?? null
      })
    };
    const auth = {
      getAuthenticatedUser: jest
        .fn()
        .mockResolvedValue({ id: 'u', permissions: options.permissions ?? [] })
    };
    const instance = new SalesService(
      sales as never,
      saleItems as never,
      salePayments as never,
      { findByPk: jest.fn() } as never,
      quotes as never,
      { findAll: jest.fn(async () => (await quotes.findByPk())?.items ?? []) } as never,
      products as never,
      variants as never,
      { resolvePrimaryImageUrl: jest.fn().mockResolvedValue(null) } as never,
      auth as never
    );
    return { instance, saleItems, salePayments, sales, quotes, products, variants };
  }

  const direct = (overrides: Partial<SaleItemInputDto> = {}): SaleItemInputDto => ({
    productId: '10',
    productVariantId: '20',
    quantity: 2,
    ...overrides
  });

  it('finds the sale for one quote without matching another customer sale', async () => {
    const { instance, sales } = setup({ permissions: ['SALE_MANAGE'] });
    await instance.list({ page: 1, limit: 1, quoteId: '33' }, 'u');
    expect(sales.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
      where: { quoteId: '33' }, limit: 1, offset: 0
    }));
  });

  it('creates a direct item with a valid product variant and snapshots', async () => {
    const { instance, saleItems } = setup();
    await instance['createDirectItem']({ id: '1' } as never, direct(), 'u', {} as never);
    expect(saleItems.create).toHaveBeenCalledWith(
      expect.objectContaining({
        productNameSnapshot: 'Sofá',
        skuSnapshot: 'SOF-1',
        unitSalePrice: '100.00',
        subtotal: '200.00'
      }),
      expect.anything()
    );
  });

  it('rejects a variant that belongs to another product', async () => {
    const { instance } = setup({ variantProductId: '99' });
    await expect(
      instance['createDirectItem']({ id: '1' } as never, direct(), 'u', {} as never)
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('permits customization without a variant only for customizable products', async () => {
    const { instance, saleItems } = setup({ allowsCustomization: true });
    await instance['createDirectItem'](
      { id: '1' } as never,
      direct({
        productVariantId: undefined,
        unitSalePrice: '120.00',
        customization: { fabric: 'Lino' }
      }),
      'u',
      {} as never
    );
    expect(saleItems.create).toHaveBeenCalledWith(
      expect.objectContaining({ productVariantId: null, customization: { fabric: 'Lino' } }),
      expect.anything()
    );
  });

  it('rejects customization without a variant for products that do not allow it', async () => {
    const { instance } = setup({ allowsCustomization: false });
    await expect(
      instance['createDirectItem'](
        { id: '1' } as never,
        direct({ productVariantId: undefined, unitSalePrice: '120.00' }),
        'u',
        {} as never
      )
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('uses the catalog price when a variant has no requested sale price', async () => {
    const { instance, saleItems } = setup();
    await instance['createDirectItem'](
      { id: '1' } as never,
      direct({ quantity: 1 }),
      'u',
      {} as never
    );
    expect(saleItems.create).toHaveBeenCalledWith(
      expect.objectContaining({
        unitListPrice: '100.00',
        unitSalePrice: '100.00',
        discountAmount: '0.00'
      }),
      expect.anything()
    );
  });

  it('rejects a negotiated price without SALE_PRICE_OVERRIDE', async () => {
    const { instance } = setup();
    await expect(
      instance['createDirectItem'](
        { id: '1' } as never,
        direct({ quantity: 1, unitSalePrice: '90.00', negotiationReason: 'Cliente frecuente' }),
        'u',
        {} as never
      )
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('requires a reason for a negotiated price', async () => {
    const { instance } = setup({ permissions: ['SALE_PRICE_OVERRIDE'] });
    await expect(
      instance['createDirectItem'](
        { id: '1' } as never,
        direct({ quantity: 1, unitSalePrice: '90.00' }),
        'u',
        {} as never
      )
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows a negotiated price with its override permission and reason', async () => {
    const { instance, saleItems } = setup({ permissions: ['SALE_PRICE_OVERRIDE'] });
    await instance['createDirectItem'](
      { id: '1' } as never,
      direct({ quantity: 1, unitSalePrice: '90.00', negotiationReason: 'Cliente frecuente' }),
      'u',
      {} as never
    );
    expect(saleItems.create).toHaveBeenCalledWith(
      expect.objectContaining({ discountAmount: '10.00', negotiationReason: 'Cliente frecuente' }),
      expect.anything()
    );
  });

  it('rejects a below-cost sale without SALE_PRICE_OVERRIDE', async () => {
    const { instance } = setup({ listPrice: '90.00', cost: '95.00' });
    await expect(
      instance['createDirectItem'](
        { id: '1' } as never,
        direct({ quantity: 1, belowCostReason: 'Liquidación' }),
        'u',
        {} as never
      )
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('requires a reason for a below-cost sale', async () => {
    const { instance } = setup({
      permissions: ['SALE_PRICE_OVERRIDE'],
      listPrice: '90.00',
      cost: '95.00'
    });
    await expect(
      instance['createDirectItem']({ id: '1' } as never, direct({ quantity: 1 }), 'u', {} as never)
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('marks a permitted below-cost sale and preserves its reason', async () => {
    const { instance, saleItems } = setup({
      permissions: ['SALE_PRICE_OVERRIDE'],
      listPrice: '90.00',
      cost: '95.00'
    });
    await instance['createDirectItem'](
      { id: '1' } as never,
      direct({ quantity: 1, belowCostReason: 'Liquidación' }),
      'u',
      {} as never
    );
    expect(saleItems.create).toHaveBeenCalledWith(
      expect.objectContaining({
        unitCostSnapshot: '95.00',
        isBelowCost: true,
        belowCostReason: 'Liquidación'
      }),
      expect.anything()
    );
  });

  it('stores a missing estimated cost as null', async () => {
    const { instance, saleItems } = setup({ cost: null });
    await instance['createDirectItem'](
      { id: '1' } as never,
      direct({ quantity: 1 }),
      'u',
      {} as never
    );
    expect(saleItems.create).toHaveBeenCalledWith(
      expect.objectContaining({ unitCostSnapshot: null, isBelowCost: false }),
      expect.anything()
    );
  });

  it('copies quote snapshots and identifies below-cost items without repricing them', async () => {
    const { instance, saleItems, variants } = setup({ cost: '95.00' });
    variants.findByPk.mockResolvedValue({ estimatedCost: '95.00' });
    const quoteItem = {
      productId: '10',
      productVariantId: '20',
      productNameSnapshot: 'Nombre histórico',
      variantNameSnapshot: 'Variante histórica',
      skuSnapshot: 'SKU-HIST',
      customization: { fabric: 'Azul' },
      quantity: 1,
      unitListPrice: '100.00',
      unitQuotedPrice: '90.00',
      discountAmount: '10.00',
      subtotal: '90.00',
      negotiationReason: 'Cotizado',
      notes: 'Nota histórica'
    };
    await instance['createQuoteItem']({ id: '1' } as never, quoteItem as never, {} as never);
    expect(saleItems.create).toHaveBeenCalledWith(
      expect.objectContaining({
        productNameSnapshot: 'Nombre histórico',
        unitSalePrice: '90.00',
        unitCostSnapshot: '95.00',
        isBelowCost: true,
        notes: 'Nota histórica'
      }),
      expect.anything()
    );
  });

  it('converts an accepted quote into a sale while preserving quoted values', async () => {
    const { instance, quotes, sales, saleItems } = setup({ cost: '95.00' });
    quotes.findByPk.mockResolvedValue({
      id: '5',
      customerId: '1',
      status: QuoteStatus.ACCEPTED,
      deliveryFee: '5.00',
      internalNotes: 'Nota de cotización',
      items: [
        {
          productId: '10',
          productVariantId: '20',
          productNameSnapshot: 'Nombre histórico',
          variantNameSnapshot: 'Variante histórica',
          skuSnapshot: 'SKU-HIST',
          customization: null,
          quantity: 1,
          unitListPrice: '100.00',
          unitQuotedPrice: '90.00',
          discountAmount: '10.00',
          subtotal: '90.00',
          negotiationReason: 'Cotizado',
          notes: null
        }
      ]
    });
    await instance.createFromQuote('5', 'u');
    expect(sales.create).toHaveBeenCalledWith(
      expect.objectContaining({ quoteId: '5', customerId: '1', deliveryFee: '5.00' }),
      expect.anything()
    );
    expect(saleItems.create).toHaveBeenCalledWith(
      expect.objectContaining({ unitSalePrice: '90.00', productNameSnapshot: 'Nombre histórico' }),
      expect.anything()
    );
  });

  it('rejects non-accepted quotes before creating a sale', async () => {
    const { instance, quotes } = setup();
    quotes.findByPk.mockResolvedValue({ status: QuoteStatus.QUOTED });
    await expect(instance.createFromQuote('5', 'u')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns conflict when an accepted quote was already converted', async () => {
    const { instance, quotes, sales } = setup();
    quotes.findByPk.mockResolvedValue({ id: '5', status: QuoteStatus.ACCEPTED, items: [{}] });
    sales.findOne.mockResolvedValue({ id: '1' });
    await expect(instance.createFromQuote('5', 'u')).rejects.toBeInstanceOf(ConflictException);
  });

  it('omits costs and margins without financial permissions', () => {
    const { instance } = setup();
    const result = instance['presentDetail'](
      {
        total: '100.00',
        items: [
          { unitSalePrice: '100.00', unitCostSnapshot: '60.00', quantity: 1, isBelowCost: false }
        ]
      },
      { id: 'u', permissions: [] }
    );
    expect(result.items).toEqual([
      expect.not.objectContaining({
        unitCostSnapshot: expect.anything(),
        grossProfit: expect.anything(),
        margin: expect.anything()
      })
    ]);
  });

  it('does not invent aggregate profit when an item has no cost', () => {
    const { instance } = setup();
    const result = instance['presentDetail'](
      {
        total: '100.00',
        items: [
          { unitSalePrice: '100.00', unitCostSnapshot: null, quantity: 1, isBelowCost: false }
        ]
      },
      { id: 'u', permissions: ['FINANCIAL_MARGIN_VIEW'] }
    );
    expect(result.financialSummary).toEqual({
      costStatus: 'MISSING_COST',
      grossProfit: null,
      margin: null
    });
  });

  it('loads page payment summaries with one grouped payment query', async () => {
    const { instance, sales, salePayments } = setup({ permissions: ['SALE_MANAGE'] });
    sales.findAndCountAll.mockResolvedValue({
      rows: [{ id: '1', total: '100.00', quoteId: null, get: () => ({ id: '1', total: '100.00', quoteId: null }) }],
      count: 1
    });
    salePayments.findAll.mockResolvedValue([{ saleId: '1', type: SalePaymentType.DEPOSIT, amount: '25.00' }]);
    await expect(instance.list({ page: 1, limit: 12 }, 'u')).resolves.toMatchObject({
      data: [expect.objectContaining({ amountPaid: '25.00', balance: '75.00' })]
    });
    expect(salePayments.findAll).toHaveBeenCalledTimes(1);
    expect(salePayments.findAll).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ saleId: ['1'] }) }));
  });
});

describe('sales calculations', () => {
  it('calculates item discount and subtotal using decimal-safe cents', () => {
    expect(calculateSaleItem('100.00', '82.50', 2)).toEqual({
      discountAmount: '35.00',
      subtotal: '165.00'
    });
  });

  it('calculates sale subtotal, discounts and delivery total centrally', () => {
    expect(
      calculateSaleTotals(
        [
          { subtotal: '165.00', discountAmount: '35.00' },
          { subtotal: '20.00', discountAmount: '0.00' }
        ],
        '5.50'
      )
    ).toEqual({ subtotal: '185.00', discountTotal: '35.00', total: '190.50' });
  });
});

describe('sale payment calculations', () => {
  const movement = (type: SalePaymentType, amount: string, adjustmentEffect?: SalePaymentAdjustmentEffect) => ({
    type,
    amount,
    adjustmentEffect
  });

  it('derives PENDING, PARTIALLY_PAID and PAID from registered movements', () => {
    expect(calculatePaymentSummary([], '100.00')).toEqual({ amountPaid: '0.00', balance: '100.00', paymentStatus: 'PENDING' });
    expect(calculatePaymentSummary([movement(SalePaymentType.DEPOSIT, '25.00')], '100.00')).toEqual({ amountPaid: '25.00', balance: '75.00', paymentStatus: 'PARTIALLY_PAID' });
    expect(calculatePaymentSummary([movement(SalePaymentType.FINAL_PAYMENT, '100.00')], '100.00')).toEqual({ amountPaid: '100.00', balance: '0.00', paymentStatus: 'PAID' });
  });

  it('applies refunds and both adjustment effects without floating point arithmetic', () => {
    expect(calculatePaymentSummary([
      movement(SalePaymentType.PAYMENT, '75.50'),
      movement(SalePaymentType.REFUND, '5.25'),
      movement(SalePaymentType.ADJUSTMENT, '10.00', SalePaymentAdjustmentEffect.ADD_TO_PAID),
      movement(SalePaymentType.ADJUSTMENT, '2.00', SalePaymentAdjustmentEffect.SUBTRACT_FROM_PAID)
    ], '100.00')).toEqual({ amountPaid: '78.25', balance: '21.75', paymentStatus: 'PARTIALLY_PAID' });
  });
});

describe('SalesService payment movements', () => {
  const paymentDto = (overrides: Partial<RegisterSalePaymentDto> = {}): RegisterSalePaymentDto => ({
    intentId: randomUUID(),
    type: SalePaymentType.PAYMENT,
    method: SalePaymentMethod.CASH,
    amount: '25.00',
    paidAt: '2026-08-06T12:00:00.000Z',
    ...overrides
  });

  function setupPayment(options: { payments?: Array<Record<string, unknown>>; status?: SaleStatus; permissions?: string[] } = {}) {
    const payments: Array<Record<string, unknown>> = [...(options.payments ?? [])].map((initial) => {
      const payment = { ...initial, status: initial.status ?? SalePaymentStatus.REGISTERED };
      return Object.assign(payment, {
        get: () => ({ ...payment }),
        update: jest.fn(async (valuesToUpdate) => Object.assign(payment, valuesToUpdate))
      });
    });
    const sale = { id: '1', customerId: 'customer-1', total: '100.00', status: options.status ?? SaleStatus.CONFIRMED };
    const transaction = { LOCK: { UPDATE: 'UPDATE' } };
    const salePayments = {
      create: jest.fn(async (values) => {
        const payment: Record<string, unknown> = { ...values, id: String(payments.length + 1), get: () => ({ ...payment }), update: jest.fn(async (valuesToUpdate) => Object.assign(payment, valuesToUpdate)) };
        payments.push(payment);
        return payment;
      }),
      findAll: jest.fn(async () => payments.filter((payment) => payment.status === SalePaymentStatus.REGISTERED)),
      findByPk: jest.fn(async (id) => payments.find((payment) => payment.id === id) ?? null)
      ,findOne: jest.fn(async ({ where }) => payments.find((payment) => payment.intentId === where.intentId) ?? null)
    };
    const sales = {
      sequelize: { transaction: jest.fn(async (callback) => callback(transaction)) },
      findByPk: jest.fn(async () => sale)
    };
    const instance = new SalesService(
      sales as never,
      {} as never,
      salePayments as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { resolvePrimaryImageUrl: jest.fn().mockResolvedValue(null) } as never,
      { getAuthenticatedUser: jest.fn().mockResolvedValue({ id: 'user-1', permissions: options.permissions ?? ['FINANCIAL_PAYMENT_REGISTER', 'FINANCIAL_PAYMENT_CORRECT'] }) } as never
    );
    return { instance, payments, salePayments, sales, transaction };
  }

  it('registers a partial payment with a transaction and UPDATE lock on Sale', async () => {
    const { instance, sales } = setupPayment();
    await expect(instance.registerPayment('1', paymentDto(), 'user-1')).resolves.toMatchObject({ amountPaid: '25.00', balance: '75.00', paymentStatus: 'PARTIALLY_PAID' });
    expect(sales.sequelize.transaction).toHaveBeenCalledTimes(1);
    expect(sales.findByPk).toHaveBeenCalledWith('1', expect.objectContaining({ lock: 'UPDATE' }));
  });

  it.each([
    ['rejects a payment above the balance', paymentDto({ amount: '101.00' })],
    ['requires an exact final payment', paymentDto({ type: SalePaymentType.FINAL_PAYMENT, amount: '99.00' })],
    ['requires adjustmentEffect for ADJUSTMENT', paymentDto({ type: SalePaymentType.ADJUSTMENT })]
  ])('%s', async (_name, dto) => {
    const { instance } = setupPayment();
    await expect(instance.registerPayment('1', dto, 'user-1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts the exact final payment and both valid adjustment directions', async () => {
    const final = setupPayment({ payments: [{ id: 'first', type: SalePaymentType.DEPOSIT, amount: '75.00' }] });
    await expect(final.instance.registerPayment('1', paymentDto({ type: SalePaymentType.FINAL_PAYMENT, amount: '25.00' }), 'user-1')).resolves.toMatchObject({ paymentStatus: 'PAID' });
    const adjustment = setupPayment({ payments: [{ id: 'first', type: SalePaymentType.PAYMENT, amount: '50.00' }] });
    await expect(adjustment.instance.registerPayment('1', paymentDto({ type: SalePaymentType.ADJUSTMENT, amount: '10.00', adjustmentEffect: SalePaymentAdjustmentEffect.ADD_TO_PAID }), 'user-1')).resolves.toMatchObject({ amountPaid: '60.00' });
    await expect(adjustment.instance.registerPayment('1', paymentDto({ type: SalePaymentType.ADJUSTMENT, amount: '5.00', adjustmentEffect: SalePaymentAdjustmentEffect.SUBTRACT_FROM_PAID }), 'user-1')).resolves.toMatchObject({ amountPaid: '55.00' });
  });

  it.each([
    ['rejects a refund above amount paid', paymentDto({ type: SalePaymentType.REFUND, amount: '30.00' }), [{ id: 'first', type: SalePaymentType.PAYMENT, amount: '25.00' }]],
    ['rejects an adjustment above the total', paymentDto({ type: SalePaymentType.ADJUSTMENT, amount: '60.00', adjustmentEffect: SalePaymentAdjustmentEffect.ADD_TO_PAID }), [{ id: 'first', type: SalePaymentType.PAYMENT, amount: '50.00' }]],
    ['rejects an adjustment below zero', paymentDto({ type: SalePaymentType.ADJUSTMENT, amount: '60.00', adjustmentEffect: SalePaymentAdjustmentEffect.SUBTRACT_FROM_PAID }), [{ id: 'first', type: SalePaymentType.PAYMENT, amount: '50.00' }]]
  ])('%s', async (_name, dto, payments) => {
    const { instance } = setupPayment({ payments });
    await expect(instance.registerPayment('1', dto, 'user-1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects movements for non-confirmed sales', async () => {
    const { instance } = setupPayment({ status: SaleStatus.CANCELLED });
    await expect(instance.registerPayment('1', paymentDto(), 'user-1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('voids a payment once, rejects a repeat and keeps the record', async () => {
    const { instance, payments } = setupPayment({ payments: [{ id: 'first', saleId: '1', type: SalePaymentType.PAYMENT, amount: '25.00' }] });
    await expect(instance.voidPayment('1', 'first', 'Duplicado', 'user-1')).resolves.toMatchObject({ amountPaid: '0.00', paymentStatus: 'PENDING' });
    expect(payments[0]).toMatchObject({ status: SalePaymentStatus.VOIDED, voidReason: 'Duplicado' });
    await expect(instance.voidPayment('1', 'first', 'Duplicado', 'user-1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects a payment from another sale, missing correction permission, and a refund void that overpays', async () => {
    const other = setupPayment({ payments: [{ id: 'other', saleId: '2', type: SalePaymentType.PAYMENT, amount: '10.00' }] });
    await expect(other.instance.voidPayment('1', 'other', 'Error', 'user-1')).rejects.toBeInstanceOf(NotFoundException);
    const forbidden = setupPayment({ permissions: ['FINANCIAL_PAYMENT_REGISTER'] });
    await expect(forbidden.instance.voidPayment('1', 'any', 'Error', 'user-1')).rejects.toBeInstanceOf(ForbiddenException);
    const overpaid = setupPayment({ payments: [
      { id: 'paid', saleId: '1', type: SalePaymentType.PAYMENT, amount: '105.00' },
      { id: 'refund', saleId: '1', type: SalePaymentType.REFUND, amount: '10.00' }
    ] });
    await expect(overpaid.instance.voidPayment('1', 'refund', 'Error', 'user-1')).rejects.toBeInstanceOf(BadRequestException);
  });
});
