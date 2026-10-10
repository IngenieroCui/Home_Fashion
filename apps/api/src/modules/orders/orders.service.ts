import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { randomUUID } from 'node:crypto';
import { col, fn, Op, Transaction } from 'sequelize';
import { AuthService } from '../auth/auth.service';
import { User } from '../auth/entities/user.model';
import { ProductVariant } from '../catalog/entities/product-variant.model';
import { Customer } from '../quotes/entities/customer.model';
import { SaleItem } from '../sales/entities/sale-item.model';
import { Sale } from '../sales/entities/sale.model';
import { SaleStatus } from '../sales/sales.types';
import { CreateOrderFromSaleDto, OrderQueryDto } from './dto/orders.dto';
import { OrderItem } from './entities/order-item.model';
import { Order } from './entities/order.model';
import { WorkshopJob } from '../workshop-jobs/entities/workshop-job.model';
import { OrderItemStatus, OrderStatus, OrderSupplyType, ORDER_MANAGE_PERMISSION } from './orders.types';

type UserContext = { permissions: string[] };
type Plain = Record<string, unknown>;
const plain = <T>(model: { get(options: { plain: true }): T }) => model.get({ plain: true });

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order) private readonly orders: typeof Order,
    @InjectModel(OrderItem) private readonly orderItems: typeof OrderItem,
    @InjectModel(Sale) private readonly sales: typeof Sale,
    @InjectModel(SaleItem) private readonly saleItems: typeof SaleItem,
    @InjectModel(ProductVariant) private readonly variants: typeof ProductVariant,
    private readonly auth: AuthService
  ) {}

  private async require(userId: string) {
    const user = await this.auth.getAuthenticatedUser(userId) as UserContext;
    if (!user.permissions.includes(ORDER_MANAGE_PERMISSION))
      throw new ForbiddenException('Missing required permission');
  }

  private async validateItems(sale: Sale & { items?: SaleItem[] }, dto: CreateOrderFromSaleDto, transaction: Transaction) {
    const saleItems = sale.items ?? [];
    if (!saleItems.length) throw new BadRequestException('Sale has no items');
    const ids = dto.items.map((item) => item.saleItemId);
    if (new Set(ids).size !== ids.length) throw new BadRequestException('Sale items cannot be duplicated');
    const byId = new Map(saleItems.map((item) => [String(item.id), item]));
    if (ids.length !== saleItems.length) throw new BadRequestException('All sale items must be included');
    const selected: Array<{ saleItem: SaleItem; input: CreateOrderFromSaleDto['items'][number] }> = [];
    for (const input of dto.items) {
      const saleItem = byId.get(input.saleItemId);
      if (!saleItem) {
        const existing = await this.saleItems.findByPk(input.saleItemId, { transaction });
        if (existing) throw new BadRequestException('Sale item does not belong to this sale');
        throw new NotFoundException('Sale item not found');
      }
      if (input.supplyType === OrderSupplyType.IN_STOCK && !saleItem.productVariantId)
        throw new BadRequestException('IN_STOCK items require a product variant');
      selected.push({ saleItem, input });
    }
    return selected;
  }

  private async reserveVariants(
    selected: Array<{ saleItem: SaleItem; input: CreateOrderFromSaleDto['items'][number] }>,
    transaction: Transaction
  ) {
    const required = new Map<string, number>();
    for (const { saleItem, input } of selected) {
      if (input.supplyType === OrderSupplyType.IN_STOCK)
        required.set(String(saleItem.productVariantId!), (required.get(String(saleItem.productVariantId!)) ?? 0) + saleItem.quantity);
    }
    const variantIds = [...required.keys()].sort((left, right) =>
      BigInt(left) === BigInt(right) ? 0 : BigInt(left) < BigInt(right) ? -1 : 1
    );
    if (!variantIds.length) return;
    const variants = await this.variants.findAll({
      where: { id: variantIds },
      transaction,
      lock: transaction.LOCK.UPDATE,
      order: [['id', 'ASC']]
    });
    if (variants.length !== variantIds.length) throw new NotFoundException('Product variant not found');
    for (const variant of variants) {
      const quantity = required.get(String(variant.id))!;
      if (variant.quantityOnHand - variant.quantityReserved < quantity)
        throw new BadRequestException('Insufficient finished inventory for this order');
    }
    for (const variant of variants) {
      await variant.update({ quantityReserved: variant.quantityReserved + required.get(String(variant.id))! }, { transaction });
    }
  }

  async createFromSale(saleId: string, dto: CreateOrderFromSaleDto, userId: string) {
    await this.require(userId);
    try {
      return await this.orders.sequelize!.transaction(async (transaction) => {
        const sale = await this.sales.findByPk(saleId, {
          include: [SaleItem],
          transaction,
          lock: transaction.LOCK.UPDATE
        });
        if (!sale) throw new NotFoundException('Sale not found');
        if (sale.status !== SaleStatus.CONFIRMED) throw new BadRequestException('Sale must be confirmed');
        if (await this.orders.findOne({ where: { saleId }, transaction, lock: transaction.LOCK.UPDATE }))
          throw new ConflictException('Sale already converted to order');
        const selected = await this.validateItems(sale, dto, transaction);
        await this.reserveVariants(selected, transaction);
        const order = await this.orders.create({
          code: `TMP-${randomUUID().replaceAll('-', '').slice(0, 20)}`,
          saleId: sale.id,
          customerId: sale.customerId,
          status: OrderStatus.OPEN,
          promisedDate: dto.promisedDate ?? null,
          notes: dto.notes ?? null,
          createdByUserId: userId
        }, { transaction });
        await order.update({ code: `HF-PED-${new Date().getFullYear()}-${String(order.id).padStart(5, '0')}` }, { transaction });
        await this.orderItems.bulkCreate(selected.map(({ saleItem, input }) => ({
          orderId: order.id,
          saleItemId: saleItem.id,
          productId: saleItem.productId,
          productVariantId: saleItem.productVariantId,
          productNameSnapshot: saleItem.productNameSnapshot,
          imageUrlSnapshot: saleItem.imageUrlSnapshot,
          variantNameSnapshot: saleItem.variantNameSnapshot,
          skuSnapshot: saleItem.skuSnapshot,
          customization: saleItem.customization,
          quantity: saleItem.quantity,
          supplyType: input.supplyType,
          status: input.supplyType === OrderSupplyType.IN_STOCK ? OrderItemStatus.RESERVED : OrderItemStatus.PENDING_PRODUCTION,
          notes: input.notes ?? saleItem.notes
        })), { transaction });
        return this.detail(order.id, transaction);
      });
    } catch (error) {
      if ((error as { name?: string }).name === 'SequelizeUniqueConstraintError')
        throw new ConflictException('Sale already converted to order');
      const code = (error as { parent?: { code?: string } }).parent?.code;
      if (code === 'ER_LOCK_DEADLOCK' || code === 'ER_LOCK_WAIT_TIMEOUT')
        throw new ConflictException('Inventory changed concurrently; retry the order');
      throw error;
    }
  }

  async list(query: OrderQueryDto, userId: string) {
    await this.require(userId);
    const where: Record<PropertyKey, unknown> = {};
    if (query.customerId) where.customerId = query.customerId;
    if (query.status) where.status = query.status;
    if (query.dateFrom || query.dateTo) where.created_at = {
      ...(query.dateFrom ? { [Op.gte]: new Date(`${query.dateFrom}T00:00:00.000Z`) } : {}),
      ...(query.dateTo ? { [Op.lte]: new Date(`${query.dateTo}T23:59:59.999Z`) } : {})
    };
    if (query.q) where[Op.or] = [
      { code: { [Op.like]: `%${query.q}%` } },
      { '$customer.full_name$': { [Op.like]: `%${query.q}%` } },
      { '$sale.code$': { [Op.like]: `%${query.q}%` } }
    ];
    const result = await this.orders.findAndCountAll({
      where,
      attributes: ['id', 'code', 'saleId', 'customerId', 'status', 'promisedDate', ['created_at', 'createdAt']],
      include: [
        { model: Customer, attributes: ['id', 'fullName', 'phone'] },
        { model: Sale, attributes: ['id', 'code'] }
      ],
      order: [['created_at', 'DESC']], limit: query.limit, offset: (query.page - 1) * query.limit, distinct: true
    });
    const ids = result.rows.map((order) => order.id);
    const counts = ids.length ? await this.orderItems.findAll({
      where: { orderId: ids },
      attributes: ['orderId', [fn('SUM', col('quantity')), 'totalItems']],
      group: ['order_id']
    }) : [];
    const countByOrder = new Map(counts.map((count) => {
      const value = plain<{ orderId: string; totalItems: string }>(count);
      return [value.orderId, Number(value.totalItems)];
    }));
    return {
      data: result.rows.map((order) => ({ ...plain<Plain>(order), totalItems: countByOrder.get(order.id) ?? 0 })),
      pagination: { page: query.page, limit: query.limit, total: result.count, totalPages: Math.ceil(result.count / query.limit) }
    };
  }

  async detail(id: string, transaction?: Transaction) {
    const order = await this.orders.findByPk(id, {
      include: [
        { model: Sale, attributes: ['id', 'code', 'status'] },
        { model: Customer, attributes: ['id', 'fullName', 'phone'] },
        { model: User, as: 'createdByUser', attributes: ['id', 'fullName', 'email'] },
        {
          model: OrderItem,
          include: [
            { model: ProductVariant, attributes: ['id', 'quantityOnHand', 'quantityReserved'] },
            {
              model: WorkshopJob,
              attributes: ['id', 'code', 'status', 'expectedCompletionDate'],
              include: [{ model: User, as: 'workshopUser', attributes: ['id', 'fullName'] }]
            }
          ]
        }
      ],
      transaction
    });
    if (!order) throw new NotFoundException('Order not found');
    return plain(order);
  }
}
