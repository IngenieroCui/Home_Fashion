import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { randomUUID } from 'node:crypto';
import { Op, Transaction, type Includeable } from 'sequelize';
import { AuthService } from '../auth/auth.service';
import { Role } from '../auth/entities/role.model';
import { User } from '../auth/entities/user.model';
import { OrderItem } from '../orders/entities/order-item.model';
import { Order } from '../orders/entities/order.model';
import { OrderItemStatus, OrderStatus } from '../orders/orders.types';
import { recalculateOrderStatus } from '../orders/order-state';
import { Customer } from '../quotes/entities/customer.model';
import { CompleteDeliveryDto, CreateDeliveryDto, DeliveryAssigneeQueryDto, DeliveryQueryDto } from './dto/deliveries.dto';
import { Delivery } from './entities/delivery.model';
import { DELIVERY_MANAGE_PERMISSION, DeliveryStatus, DeliveryType } from './deliveries.types';

type Plain = Record<string, unknown>;
const asPlain = <T>(model: { get(options: { plain: true }): T }) => model.get({ plain: true });

@Injectable()
export class DeliveriesService {
  constructor(
    @InjectModel(Delivery) private readonly deliveries: typeof Delivery,
    @InjectModel(Order) private readonly orders: typeof Order,
    @InjectModel(OrderItem) private readonly orderItems: typeof OrderItem,
    @InjectModel(User) private readonly users: typeof User,
    private readonly auth: AuthService
  ) {}

  async listAssignees(query: DeliveryAssigneeQueryDto, userId: string) {
    await this.requireManage(userId);
    const roleCode = query.deliveryType === DeliveryType.OWNER ? 'ADMIN' : 'EMPLOYEE';
    const where: Record<PropertyKey, unknown> = { isActive: true };
    if (query.q) where[Op.or] = [
      { fullName: { [Op.like]: `%${query.q}%` } },
      { email: { [Op.like]: `%${query.q}%` } }
    ];
    const result = await this.users.findAndCountAll({
      attributes: ['id', 'fullName', 'email', 'isActive'],
      where,
      include: [{ model: Role, attributes: ['code'], where: { code: roleCode }, required: true }],
      order: [['fullName', 'ASC'], ['id', 'ASC']],
      limit: query.limit,
      offset: (query.page - 1) * query.limit,
      distinct: true
    });
    return {
      data: result.rows.map((user) => ({ id: user.id, name: user.fullName, email: user.email, active: user.isActive, deliveryType: query.deliveryType })),
      pagination: this.pagination(query.page, query.limit, result.count)
    };
  }

  async create(dto: CreateDeliveryDto, userId: string) {
    await this.requireManage(userId);
    try {
      return await this.deliveries.sequelize!.transaction(async (transaction) => {
        const order = await this.orders.findByPk(dto.orderId, { transaction, lock: transaction.LOCK.UPDATE });
        if (!order) throw new NotFoundException('Order not found');
        if (order.status === OrderStatus.CANCELLED || order.status === OrderStatus.COMPLETED)
          throw new BadRequestException('Order cannot receive a delivery in its current status');
        const existing = await this.deliveries.findOne({ where: { orderId: order.id }, transaction, lock: transaction.LOCK.UPDATE });
        if (existing && existing.status !== DeliveryStatus.CANCELLED)
          throw new ConflictException('Order already has an active delivery');
        await this.validateAssignment(dto, transaction);
        const scheduling = this.schedulingValues(dto);
        if (existing) {
          await existing.update({
            ...scheduling,
            status: DeliveryStatus.SCHEDULED,
            receiverName: null,
            evidenceUrls: null,
            deliveredAt: null
          }, { transaction });
          return this.loadDetail(existing.id, transaction);
        }
        const createdAt = new Date();
        const delivery = await this.deliveries.create({
          code: `TMP-${randomUUID()}`,
          orderId: order.id,
          status: DeliveryStatus.SCHEDULED,
          ...scheduling,
          receiverName: null,
          evidenceUrls: null,
          deliveredAt: null,
          createdByUserId: userId
        }, { transaction });
        await delivery.update({ code: `HF-ENT-${createdAt.getFullYear()}-${String(delivery.id).padStart(5, '0')}` }, { transaction });
        return this.loadDetail(delivery.id, transaction);
      });
    } catch (error) {
      if ((error as { name?: string }).name === 'SequelizeUniqueConstraintError')
        throw new ConflictException('Order already has an active delivery');
      throw error;
    }
  }

  async list(query: DeliveryQueryDto, userId: string) {
    await this.requireManage(userId);
    const where: Record<PropertyKey, unknown> = {};
    if (query.status) where.status = query.status;
    if (query.deliveryType) where.deliveryType = query.deliveryType;
    if (query.assignedUserId) where.assignedUserId = query.assignedUserId;
    if (query.orderId) where.orderId = query.orderId;
    if (query.dateFrom || query.dateTo) where.scheduledDate = {
      ...(query.dateFrom ? { [Op.gte]: query.dateFrom } : {}),
      ...(query.dateTo ? { [Op.lte]: query.dateTo } : {})
    };
    if (query.q) where[Op.or] = [
      { code: { [Op.like]: `%${query.q}%` } },
      { contactName: { [Op.like]: `%${query.q}%` } },
      { externalDriverName: { [Op.like]: `%${query.q}%` } },
      { '$assignedUser.full_name$': { [Op.like]: `%${query.q}%` } },
      { '$order.code$': { [Op.like]: `%${query.q}%` } },
      { '$order.customer.full_name$': { [Op.like]: `%${query.q}%` } }
    ];
    const result = await this.deliveries.findAndCountAll({
      attributes: ['id', 'code', 'orderId', 'status', 'scheduledDate', 'timeWindow', 'deliveryType', 'assignedUserId', 'externalDriverName', 'address', 'contactName', 'contactPhone', ['created_at', 'createdAt']],
      where,
      include: this.deliveryIncludes(false),
      order: [['scheduledDate', 'ASC'], ['id', 'ASC']],
      limit: query.limit,
      offset: (query.page - 1) * query.limit,
      distinct: true,
      subQuery: false
    });
    return {
      data: result.rows.map((delivery) => this.serializeList(delivery)),
      pagination: this.pagination(query.page, query.limit, result.count)
    };
  }

  async detail(id: string, userId: string) {
    await this.requireManage(userId);
    return this.loadDetail(id);
  }

  async start(id: string, userId: string) {
    await this.requireManage(userId);
    return this.deliveries.sequelize!.transaction(async (transaction) => {
      const { delivery, order, items } = await this.lockAggregate(id, transaction);
      if (delivery.status !== DeliveryStatus.SCHEDULED)
        throw new BadRequestException('Only a SCHEDULED delivery can start');
      if (order.status === OrderStatus.CANCELLED || order.status === OrderStatus.COMPLETED)
        throw new BadRequestException('Order cannot start delivery in its current status');
      const applicable = items.filter((item) => item.status !== OrderItemStatus.CANCELLED);
      if (!applicable.length) throw new BadRequestException('Order has no items available for delivery');
      if (applicable.some((item) => item.status !== OrderItemStatus.RESERVED && item.status !== OrderItemStatus.READY))
        throw new BadRequestException('Every non-cancelled order item must be RESERVED or READY');
      await order.update({ status: OrderStatus.IN_PROGRESS }, { transaction });
      await delivery.update({ status: DeliveryStatus.OUT_FOR_DELIVERY }, { transaction });
      return this.loadDetail(delivery.id, transaction);
    });
  }

  async complete(id: string, dto: CompleteDeliveryDto, userId: string) {
    await this.requireManage(userId);
    return this.deliveries.sequelize!.transaction(async (transaction) => {
      const { delivery, order, items } = await this.lockAggregate(id, transaction);
      if (delivery.status !== DeliveryStatus.OUT_FOR_DELIVERY)
        throw new BadRequestException('Only an OUT_FOR_DELIVERY delivery can be completed');
      if (order.status === OrderStatus.CANCELLED || order.status === OrderStatus.COMPLETED)
        throw new BadRequestException('Order cannot be completed through delivery in its current status');
      const applicable = items.filter((item) => item.status !== OrderItemStatus.CANCELLED);
      if (!applicable.length) throw new BadRequestException('Order has no items available for delivery');
      if (applicable.some((item) => ![OrderItemStatus.RESERVED, OrderItemStatus.READY, OrderItemStatus.DELIVERED].includes(item.status)))
        throw new ConflictException('Order item state changed after delivery started');
      for (const item of applicable) {
        if (item.status === OrderItemStatus.RESERVED || item.status === OrderItemStatus.READY)
          await item.update({ status: OrderItemStatus.DELIVERED }, { transaction });
      }
      await recalculateOrderStatus(order, items, transaction);
      await delivery.update({
        status: DeliveryStatus.DELIVERED,
        receiverName: dto.receiverName.trim(),
        evidenceUrls: dto.evidenceUrls,
        deliveredAt: new Date()
      }, { transaction });
      return this.loadDetail(delivery.id, transaction);
    });
  }

  async cancel(id: string, userId: string) {
    await this.requireManage(userId);
    return this.deliveries.sequelize!.transaction(async (transaction) => {
      const { delivery, order, items } = await this.lockAggregate(id, transaction);
      if (delivery.status !== DeliveryStatus.SCHEDULED && delivery.status !== DeliveryStatus.OUT_FOR_DELIVERY)
        throw new BadRequestException('Delivery cannot be cancelled in its current status');
      if (delivery.status === DeliveryStatus.OUT_FOR_DELIVERY) {
        if (order.status !== OrderStatus.IN_PROGRESS)
          throw new ConflictException('Order state changed after delivery started');
        await recalculateOrderStatus(order, items, transaction);
      }
      await delivery.update({ status: DeliveryStatus.CANCELLED }, { transaction });
      return this.loadDetail(delivery.id, transaction);
    });
  }

  private schedulingValues(dto: CreateDeliveryDto) {
    return {
      address: dto.address,
      addressReference: dto.addressReference?.trim() || null,
      contactName: dto.contactName,
      contactPhone: dto.contactPhone,
      scheduledDate: dto.scheduledDate,
      timeWindow: dto.timeWindow?.trim() || null,
      deliveryType: dto.deliveryType,
      assignedUserId: dto.deliveryType === DeliveryType.EXTERNAL_DRIVER ? null : dto.assignedUserId!,
      externalDriverName: dto.deliveryType === DeliveryType.EXTERNAL_DRIVER ? dto.externalDriverName!.trim() : null,
      fee: this.normalizeMoney(dto.fee),
      notes: dto.notes?.trim() || null
    };
  }

  private async validateAssignment(dto: CreateDeliveryDto, transaction: Transaction) {
    if (dto.deliveryType === DeliveryType.EXTERNAL_DRIVER) {
      if (dto.assignedUserId) throw new BadRequestException('EXTERNAL_DRIVER cannot have an assigned user');
      if (!dto.externalDriverName?.trim()) throw new BadRequestException('EXTERNAL_DRIVER requires a driver name');
      return;
    }
    if (!dto.assignedUserId) throw new BadRequestException(`${dto.deliveryType} requires an assigned user`);
    if (dto.externalDriverName?.trim()) throw new BadRequestException(`${dto.deliveryType} cannot have an external driver name`);
    const user = await this.users.findByPk(dto.assignedUserId, {
      include: [{ model: Role, attributes: ['id', 'code'] }],
      transaction,
      lock: transaction.LOCK.UPDATE
    });
    if (!user) throw new NotFoundException('Assigned user not found');
    if (!user.isActive) throw new BadRequestException('Assigned user is inactive');
    const expectedRole = dto.deliveryType === DeliveryType.OWNER ? 'ADMIN' : 'EMPLOYEE';
    if (user.role?.code !== expectedRole)
      throw new ForbiddenException(`${dto.deliveryType} requires an active ${expectedRole} user`);
  }

  private async lockAggregate(id: string, transaction: Transaction) {
    const delivery = await this.deliveries.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!delivery) throw new NotFoundException('Delivery not found');
    const order = await this.orders.findByPk(delivery.orderId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!order) throw new NotFoundException('Order not found');
    const items = await this.orderItems.findAll({
      where: { orderId: order.id },
      transaction,
      lock: transaction.LOCK.UPDATE,
      order: [['id', 'ASC']]
    });
    return { delivery, order, items };
  }

  private async loadDetail(id: string, transaction?: Transaction) {
    const delivery = await this.deliveries.findByPk(id, { include: this.deliveryIncludes(true), transaction });
    if (!delivery) throw new NotFoundException('Delivery not found');
    return this.serializeDetail(delivery);
  }

  private deliveryIncludes(detail: boolean) {
    return [
      { model: User, as: 'assignedUser', attributes: ['id', 'fullName', 'email', 'isActive'], required: false },
      ...(detail ? [{ model: User, as: 'createdByUser', attributes: ['id', 'fullName'], required: true }] : []),
      {
        model: Order,
        attributes: detail ? ['id', 'code', 'status', 'promisedDate', 'notes'] : ['id', 'code', 'status'],
        required: true,
        include: [
          { model: Customer, attributes: ['id', 'fullName', 'phone'], required: true },
          ...(detail ? [{ model: OrderItem, attributes: ['id', 'productNameSnapshot', 'variantNameSnapshot', 'skuSnapshot', 'imageUrlSnapshot', 'quantity', 'supplyType', 'status'] }] : [])
        ]
      }
    ] as Includeable[];
  }

  private serializeList(delivery: Delivery) {
    const value = asPlain<Plain & { order?: Plain & { customer?: Plain }; assignedUser?: Plain }>(delivery);
    const order = value.order ?? {};
    return {
      id: value.id,
      code: value.code,
      status: value.status,
      scheduledDate: value.scheduledDate,
      timeWindow: value.timeWindow,
      deliveryType: value.deliveryType,
      address: value.address,
      contactName: value.contactName,
      contactPhone: value.contactPhone,
      externalDriverName: value.externalDriverName,
      assignedUser: value.assignedUser ?? null,
      order: { id: order.id, code: order.code, status: order.status },
      customer: order.customer,
      createdAt: value.createdAt
    };
  }

  private serializeDetail(delivery: Delivery) {
    const value = asPlain<Plain & { order?: Plain & { customer?: Plain; items?: Plain[] }; assignedUser?: Plain; createdByUser?: Plain }>(delivery);
    const order = value.order ?? {};
    return {
      id: value.id,
      code: value.code,
      status: value.status,
      address: value.address,
      addressReference: value.addressReference,
      contactName: value.contactName,
      contactPhone: value.contactPhone,
      scheduledDate: value.scheduledDate,
      timeWindow: value.timeWindow,
      deliveryType: value.deliveryType,
      assignedUser: value.assignedUser ?? null,
      externalDriverName: value.externalDriverName,
      fee: value.fee,
      notes: value.notes,
      receiverName: value.receiverName,
      evidenceUrls: value.evidenceUrls,
      deliveredAt: value.deliveredAt,
      createdByUser: value.createdByUser,
      createdAt: value.createdAt,
      updatedAt: value.updatedAt,
      order: {
        id: order.id,
        code: order.code,
        status: order.status,
        promisedDate: order.promisedDate,
        notes: order.notes
      },
      customer: order.customer,
      items: order.items ?? []
    };
  }

  private async requireManage(userId: string) {
    const user = await this.auth.getAuthenticatedUser(userId);
    if (!user.permissions.includes(DELIVERY_MANAGE_PERMISSION)) throw new ForbiddenException('Missing required permission');
  }

  private normalizeMoney(value?: string) {
    if (value === undefined) return null;
    const [whole, fraction = ''] = value.split('.');
    return `${BigInt(whole)}.${fraction.padEnd(2, '0')}`;
  }

  private pagination(page: number, limit: number, total: number) {
    return { page, limit, total, totalPages: Math.ceil(total / limit) };
  }
}
