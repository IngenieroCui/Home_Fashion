import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { randomUUID } from 'node:crypto';
import { Op, Transaction } from 'sequelize';
import { AuthService } from '../auth/auth.service';
import { User } from '../auth/entities/user.model';
import { Product } from '../catalog/entities/product.model';
import { ProductVariant } from '../catalog/entities/product-variant.model';
import { Customer } from '../quotes/entities/customer.model';
import { QuoteItem } from '../quotes/entities/quote-item.model';
import { Quote } from '../quotes/entities/quote.model';
import { QuoteStatus } from '../quotes/quotes.types';
import {
  CreateSaleDto,
  RegisterSalePaymentDto,
  SaleItemInputDto,
  SaleQueryDto
} from './dto/sales.dto';
import { SaleItem } from './entities/sale-item.model';
import { SalePayment } from './entities/sale-payment.model';
import { Sale } from './entities/sale.model';
import {
  calculatePaymentSummary,
  calculateSaleItem,
  calculateSaleTotals,
  cents,
  money
} from './sales-calculations';
import {
  COST_VIEW_PERMISSION,
  MARGIN_VIEW_PERMISSION,
  PRICE_OVERRIDE_PERMISSION,
  PAYMENT_CORRECT_PERMISSION,
  PAYMENT_REGISTER_PERMISSION,
  SALE_MANAGE_PERMISSION,
  SalePaymentAdjustmentEffect,
  SalePaymentStatus,
  SalePaymentType,
  SaleStatus
} from './sales.types';

type UserContext = { id: string; permissions: string[] };
type Plain = Record<string, unknown>;
const plain = <T>(model: { get(options: { plain: true }): T }) => model.get({ plain: true });

@Injectable()
export class SalesService {
  constructor(
    @InjectModel(Sale) private readonly sales: typeof Sale,
    @InjectModel(SaleItem) private readonly saleItems: typeof SaleItem,
    @InjectModel(SalePayment) private readonly salePayments: typeof SalePayment,
    @InjectModel(Customer) private readonly customers: typeof Customer,
    @InjectModel(Quote) private readonly quotes: typeof Quote,
    @InjectModel(QuoteItem) private readonly quoteItems: typeof QuoteItem,
    @InjectModel(Product) private readonly products: typeof Product,
    @InjectModel(ProductVariant) private readonly variants: typeof ProductVariant,
    private readonly auth: AuthService
  ) {}

  private async user(userId: string) {
    return this.auth.getAuthenticatedUser(userId) as Promise<UserContext>;
  }
  private require(user: UserContext, permission: string) {
    if (!user.permissions.includes(permission))
      throw new ForbiddenException('Missing required permission');
  }

  private async customer(id: string, transaction?: Transaction) {
    const customer = await this.customers.findByPk(id, { transaction });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  private async sale(id: string, include = false, transaction?: Transaction) {
    const options = include
      ? {
          include: [
            { model: Customer },
            { model: Quote },
            { model: User, as: 'createdByUser', attributes: ['id', 'fullName', 'email'] },
            { model: SaleItem },
            {
              model: SalePayment,
              include: [
                { model: User, as: 'createdBy', attributes: ['id', 'fullName', 'email'] },
                { model: User, as: 'voidedBy', attributes: ['id', 'fullName', 'email'] }
              ]
            }
          ],
          transaction
        }
      : { transaction };
    const sale = await this.sales.findByPk(id, options);
    if (!sale) throw new NotFoundException('Sale not found');
    return sale;
  }

  private async overrideAllowed(userId: string) {
    return (await this.user(userId)).permissions.includes(PRICE_OVERRIDE_PERMISSION);
  }

  private async createSaleRecord(
    customerId: string,
    deliveryFee: string,
    notes: string | undefined,
    quoteId: string | null,
    userId: string,
    transaction: Transaction
  ) {
    const sale = await this.sales.create(
      {
        code: `TMP-${randomUUID().replaceAll('-', '').slice(0, 20)}`,
        customerId,
        quoteId,
        status: SaleStatus.CONFIRMED,
        subtotal: '0.00',
        discountTotal: '0.00',
        deliveryFee,
        total: '0.00',
        notes: notes ?? null,
        createdByUserId: userId,
        cancelledByUserId: null,
        cancelledAt: null,
        cancellationReason: null
      },
      { transaction }
    );
    await sale.update(
      { code: `HF-VTA-${new Date().getFullYear()}-${sale.id.padStart(5, '0')}` },
      { transaction }
    );
    return sale;
  }

  private async createDirectItem(
    sale: Sale,
    input: SaleItemInputDto,
    userId: string,
    transaction: Transaction
  ) {
    const product = await this.products.findByPk(input.productId, { transaction });
    if (!product) throw new NotFoundException('Product not found');

    let variant: ProductVariant | null = null;
    if (input.productVariantId) {
      variant = await this.variants.findByPk(input.productVariantId, { transaction });
      if (!variant) throw new NotFoundException('Product variant not found');
      if (variant.productId !== product.id)
        throw new BadRequestException('Product variant does not belong to product');
    } else if (!product.allowsCustomization) {
      throw new BadRequestException('Product does not allow customization');
    }

    const listPrice = variant?.salePrice ?? null;
    if (!variant && input.unitSalePrice === undefined)
      throw new BadRequestException('Custom items require a sale price');
    const unitSalePrice =
      input.unitSalePrice === undefined ? listPrice! : money(cents(input.unitSalePrice));
    if (cents(unitSalePrice) <= 0n)
      throw new BadRequestException('unitSalePrice must be greater than zero');
    const hasPriceOverride = listPrice !== null && cents(unitSalePrice) !== cents(listPrice);
    if (hasPriceOverride && !input.negotiationReason)
      throw new BadRequestException('A negotiated price requires negotiationReason');
    if (hasPriceOverride && !(await this.overrideAllowed(userId)))
      throw new ForbiddenException('A negotiated price requires SALE_PRICE_OVERRIDE');

    const catalogCost = variant?.estimatedCost;
    const unitCostSnapshot =
      catalogCost === undefined || catalogCost === null || catalogCost === '' ? null : catalogCost;
    const isBelowCost = unitCostSnapshot !== null && cents(unitSalePrice) < cents(unitCostSnapshot);
    if (isBelowCost && !input.belowCostReason)
      throw new BadRequestException('A sale below cost requires belowCostReason');
    if (isBelowCost && !(await this.overrideAllowed(userId)))
      throw new ForbiddenException('A sale below cost requires SALE_PRICE_OVERRIDE');

    const amounts = calculateSaleItem(listPrice, unitSalePrice, input.quantity);
    return this.saleItems.create(
      {
        saleId: sale.id,
        productId: product.id,
        productVariantId: variant?.id ?? null,
        productNameSnapshot: product.name,
        variantNameSnapshot: variant?.name ?? null,
        skuSnapshot: variant?.sku ?? null,
        customization: input.customization ?? null,
        quantity: input.quantity,
        unitListPrice: listPrice,
        unitSalePrice,
        unitCostSnapshot,
        ...amounts,
        negotiationReason: input.negotiationReason ?? null,
        isBelowCost,
        belowCostReason: isBelowCost ? input.belowCostReason! : null,
        notes: input.notes ?? null
      },
      { transaction }
    );
  }

  private async createQuoteItem(sale: Sale, item: QuoteItem, transaction: Transaction) {
    if (
      item.unitQuotedPrice === null ||
      cents(item.unitQuotedPrice) <= 0n ||
      item.subtotal === null
    ) {
      throw new BadRequestException('Accepted quote has an item without a price');
    }
    const variant = item.productVariantId
      ? await this.variants.findByPk(item.productVariantId, { transaction })
      : null;
    const catalogCost = variant?.estimatedCost;
    const unitCostSnapshot =
      catalogCost === undefined || catalogCost === null || catalogCost === '' ? null : catalogCost;
    const isBelowCost =
      unitCostSnapshot !== null && cents(item.unitQuotedPrice) < cents(unitCostSnapshot);
    return this.saleItems.create(
      {
        saleId: sale.id,
        productId: item.productId,
        productVariantId: item.productVariantId,
        productNameSnapshot: item.productNameSnapshot,
        variantNameSnapshot: item.variantNameSnapshot,
        skuSnapshot: item.skuSnapshot,
        customization: item.customization,
        quantity: item.quantity,
        unitListPrice: item.unitListPrice,
        unitSalePrice: item.unitQuotedPrice,
        unitCostSnapshot,
        discountAmount: item.discountAmount,
        subtotal: item.subtotal,
        negotiationReason: item.negotiationReason,
        isBelowCost,
        belowCostReason: null,
        notes: item.notes
      },
      { transaction }
    );
  }

  private async recalculate(sale: Sale, transaction: Transaction) {
    const items = await this.saleItems.findAll({ where: { saleId: sale.id }, transaction });
    const values = calculateSaleTotals(items, sale.deliveryFee);
    await sale.update(values, { transaction });
  }

  private async paymentSummary(sale: Sale, transaction?: Transaction) {
    const payments = await this.salePayments.findAll({
      where: { saleId: sale.id, status: SalePaymentStatus.REGISTERED },
      transaction
    });
    return calculatePaymentSummary(payments, sale.total);
  }

  private validatePayment(dto: RegisterSalePaymentDto, summary: ReturnType<typeof calculatePaymentSummary>) {
    const amount = cents(dto.amount);
    if (amount <= 0n) throw new BadRequestException('amount must be greater than zero');
    const paid = cents(summary.amountPaid);
    const total = paid + cents(summary.balance);
    if (dto.type === SalePaymentType.ADJUSTMENT && !dto.adjustmentEffect)
      throw new BadRequestException('adjustmentEffect is required for ADJUSTMENT');
    if (dto.type !== SalePaymentType.ADJUSTMENT && dto.adjustmentEffect)
      throw new BadRequestException('adjustmentEffect is only allowed for ADJUSTMENT');
    if (dto.type === SalePaymentType.FINAL_PAYMENT && amount !== cents(summary.balance))
      throw new BadRequestException('FINAL_PAYMENT must equal the current balance');
    const resultingPaid =
      dto.type === SalePaymentType.REFUND ||
      (dto.type === SalePaymentType.ADJUSTMENT &&
        dto.adjustmentEffect === SalePaymentAdjustmentEffect.SUBTRACT_FROM_PAID)
        ? paid - amount
        : paid + amount;
    if (dto.type === SalePaymentType.REFUND && amount > paid)
      throw new BadRequestException('Refund cannot exceed amount paid');
    if (resultingPaid < 0n)
      throw new BadRequestException('Payment movement cannot make amount paid negative');
    if (resultingPaid > total)
      throw new BadRequestException('Payment cannot exceed the current balance');
  }

  async registerPayment(saleId: string, dto: RegisterSalePaymentDto, userId: string) {
    const user = await this.user(userId);
    this.require(user, PAYMENT_REGISTER_PERMISSION);
    return this.sales.sequelize!.transaction(async (transaction) => {
      const sale = await this.sales.findByPk(saleId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!sale) throw new NotFoundException('Sale not found');
      if (sale.status !== SaleStatus.CONFIRMED)
        throw new BadRequestException('Payments can only be registered for confirmed sales');
      const summary = await this.paymentSummary(sale, transaction);
      this.validatePayment(dto, summary);
      const payment = await this.salePayments.create(
        {
          saleId: sale.id,
          customerId: sale.customerId,
          type: dto.type,
          method: dto.method,
          adjustmentEffect: dto.adjustmentEffect ?? null,
          amount: money(cents(dto.amount)),
          paidAt: new Date(dto.paidAt),
          reference: dto.reference ?? null,
          notes: dto.notes ?? null,
          evidenceUrl: dto.evidenceUrl ?? null,
          status: SalePaymentStatus.REGISTERED,
          createdByUserId: userId,
          voidedByUserId: null,
          voidedAt: null,
          voidReason: null
        },
        { transaction }
      );
      const updated = await this.paymentSummary(sale, transaction);
      return { payment: plain<Plain>(payment), ...updated };
    });
  }

  async voidPayment(saleId: string, paymentId: string, reason: string, userId: string) {
    const user = await this.user(userId);
    this.require(user, PAYMENT_CORRECT_PERMISSION);
    return this.sales.sequelize!.transaction(async (transaction) => {
      const sale = await this.sales.findByPk(saleId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!sale) throw new NotFoundException('Sale not found');
      const payment = await this.salePayments.findByPk(paymentId, {
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      if (!payment || payment.saleId !== sale.id) throw new NotFoundException('Sale payment not found');
      if (payment.status === SalePaymentStatus.VOIDED) {
        return { payment: plain<Plain>(payment), ...(await this.paymentSummary(sale, transaction)) };
      }
      const registered = await this.salePayments.findAll({
        where: { saleId: sale.id, status: SalePaymentStatus.REGISTERED },
        transaction
      });
      const summary = calculatePaymentSummary(
        registered.filter((registeredPayment) => registeredPayment.id !== payment.id),
        sale.total
      );
      if (cents(summary.amountPaid) < 0n || cents(summary.amountPaid) > cents(sale.total))
        throw new BadRequestException('Voiding this payment would make the balance inconsistent');
      await payment.update(
        { status: SalePaymentStatus.VOIDED, voidedByUserId: userId, voidedAt: new Date(), voidReason: reason },
        { transaction }
      );
      return { payment: plain<Plain>(payment), ...summary };
    });
  }

  async createDirect(dto: CreateSaleDto, userId: string) {
    if (!dto.items.length) throw new BadRequestException('A sale requires at least one item');
    const deliveryFee = money(cents(dto.deliveryFee ?? '0'));
    if (cents(deliveryFee) < 0n) throw new BadRequestException('deliveryFee cannot be negative');
    return this.sales.sequelize!.transaction(async (transaction) => {
      await this.customer(dto.customerId, transaction);
      const sale = await this.createSaleRecord(
        dto.customerId,
        deliveryFee,
        dto.notes,
        null,
        userId,
        transaction
      );
      for (const item of dto.items) await this.createDirectItem(sale, item, userId, transaction);
      await this.recalculate(sale, transaction);
      return this.detail(sale.id, userId, transaction);
    });
  }

  async createFromQuote(quoteId: string, userId: string) {
    try {
      return await this.sales.sequelize!.transaction(async (transaction) => {
        const quote = await this.quotes.findByPk(quoteId, {
          include: [QuoteItem],
          transaction,
          lock: transaction.LOCK.UPDATE
        });
        if (!quote) throw new NotFoundException('Quote not found');
        if (quote.status !== QuoteStatus.ACCEPTED)
          throw new BadRequestException('Only accepted quotes can become sales');
        if (
          await this.sales.findOne({
            where: { quoteId },
            transaction,
            lock: transaction.LOCK.UPDATE
          })
        )
          throw new ConflictException('Quote already converted to sale');
        const items = quote.items ?? [];
        if (!items.length) throw new BadRequestException('Accepted quote has no items');
        const sale = await this.createSaleRecord(
          quote.customerId,
          money(cents(quote.deliveryFee)),
          quote.internalNotes ?? undefined,
          quote.id,
          userId,
          transaction
        );
        for (const item of items) await this.createQuoteItem(sale, item, transaction);
        await this.recalculate(sale, transaction);
        return this.detail(sale.id, userId, transaction);
      });
    } catch (error) {
      if ((error as { name?: string }).name === 'SequelizeUniqueConstraintError')
        throw new ConflictException('Quote already converted to sale');
      throw error;
    }
  }

  private presentDetail(raw: Plain, user: UserContext) {
    const sourceItems = (raw.items as Plain[] | undefined) ?? [];
    const missingCost = sourceItems.some((item) => item.unitCostSnapshot === null);
    const items = sourceItems.map((item) => {
      const result: Plain = { ...item };
      const cost = item.unitCostSnapshot as string | null;
      if (!user.permissions.includes(COST_VIEW_PERMISSION)) delete result.unitCostSnapshot;
      if (user.permissions.includes(MARGIN_VIEW_PERMISSION)) {
        result.grossProfit =
          cost === null
            ? null
            : money(
                (cents(item.unitSalePrice as string) - cents(cost)) *
                  BigInt(item.quantity as number)
              );
        result.margin =
          cost === null
            ? null
            : Number(
                ((cents(item.unitSalePrice as string) - cents(cost)) * 10000n) /
                  cents(item.unitSalePrice as string)
              ) / 100;
      }
      return result;
    });
    const warnings: string[] = [];
    if (sourceItems.some((item) => item.isBelowCost === true))
      warnings.push('Uno o más elementos se vendieron por debajo del costo registrado.');
    if (missingCost) warnings.push('Hay elementos cuyo costo no está registrado.');
    const payments = (raw.payments as Plain[] | undefined) ?? [];
    const registeredPayments = payments.filter(
      (payment) => payment.status === SalePaymentStatus.REGISTERED
    );
    const result: Plain = {
      ...raw,
      items,
      payments,
      ...calculatePaymentSummary(registeredPayments as Array<{ type: string; amount: string; adjustmentEffect?: string | null }>, raw.total as string),
      warnings
    };
    if (user.permissions.includes(MARGIN_VIEW_PERMISSION)) {
      if (missingCost)
        result.financialSummary = { costStatus: 'MISSING_COST', grossProfit: null, margin: null };
      else {
        const grossProfit = items.reduce(
          (sum, item) => sum + cents(item.grossProfit as string),
          0n
        );
        result.financialSummary = {
          costStatus: 'COMPLETE',
          grossProfit: money(grossProfit),
          margin:
            cents(raw.total as string) === 0n
              ? null
              : Number((grossProfit * 10000n) / cents(raw.total as string)) / 100
        };
      }
    }
    return result;
  }

  async detail(id: string, userId: string, transaction?: Transaction) {
    const user = await this.user(userId);
    const sale = await this.sale(id, true, transaction);
    return this.presentDetail(plain<Plain>(sale), user);
  }

  async list(query: SaleQueryDto, userId: string) {
    const user = await this.user(userId);
    this.require(user, SALE_MANAGE_PERMISSION);
    const where: Record<PropertyKey, unknown> = {};
    if (query.customerId) where.customerId = query.customerId;
    if (query.status) where.status = query.status;
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {
        ...(query.dateFrom ? { [Op.gte]: new Date(`${query.dateFrom}T00:00:00.000Z`) } : {}),
        ...(query.dateTo ? { [Op.lte]: new Date(`${query.dateTo}T23:59:59.999Z`) } : {})
      };
    }
    if (query.q)
      where[Op.or] = [
        { code: { [Op.like]: `%${query.q}%` } },
        { '$customer.full_name$': { [Op.like]: `%${query.q}%` } }
      ];
    const result = await this.sales.findAndCountAll({
      where,
      attributes: [
        'id',
        'code',
        'customerId',
        'quoteId',
        'status',
        'subtotal',
        'discountTotal',
        'deliveryFee',
        'total',
        'createdAt'
      ],
      include: [{ model: Customer, attributes: ['id', 'fullName', 'phone'] }],
      order: [['createdAt', 'DESC']],
      limit: query.limit,
      offset: (query.page - 1) * query.limit,
      distinct: true
    });
    const saleIds = result.rows.map((sale) => sale.id);
    const payments = saleIds.length
      ? await this.salePayments.findAll({
          where: { saleId: saleIds, status: SalePaymentStatus.REGISTERED }
        })
      : [];
    const paymentsBySale = new Map<string, SalePayment[]>();
    for (const payment of payments) {
      const current = paymentsBySale.get(payment.saleId) ?? [];
      current.push(payment);
      paymentsBySale.set(payment.saleId, current);
    }
    return {
      data: result.rows.map((sale) => {
        const value = plain<Plain>(sale);
        return {
          ...value,
          origin: value.quoteId === null ? 'DIRECT' : 'QUOTE',
          ...calculatePaymentSummary(paymentsBySale.get(sale.id) ?? [], sale.total)
        };
      }),
      pagination: {
        page: query.page,
        limit: query.limit,
        total: result.count,
        totalPages: Math.ceil(result.count / query.limit)
      }
    };
  }
}
