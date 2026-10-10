import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { randomUUID } from 'node:crypto';
import { Op, Transaction, type Includeable } from 'sequelize';
import { User } from '../auth/entities/user.model';
import { Role } from '../auth/entities/role.model';
import { OrderItemStatus, OrderStatus, OrderSupplyType } from '../orders/orders.types';
import { OrderItem } from '../orders/entities/order-item.model';
import { Order } from '../orders/entities/order.model';
import { Customer } from '../quotes/entities/customer.model';
import { CreateWorkshopJobDto, WorkshopJobQueryDto, WorkshopUserQueryDto } from './dto/workshop-jobs.dto';
import { WorkshopJob } from './entities/workshop-job.model';
import { WorkshopProgressReport } from './entities/workshop-progress-report.model';
import { WorkshopJobStatus } from './workshop-jobs.types';

type Plain = Record<string, unknown>;
const plain = <T>(model: { get(options: { plain: true }): T }) => model.get({ plain: true });

@Injectable()
export class WorkshopJobsService {
  constructor(
    @InjectModel(WorkshopJob) private readonly jobs: typeof WorkshopJob,
    @InjectModel(OrderItem) private readonly orderItems: typeof OrderItem,
    @InjectModel(Order) private readonly orders: typeof Order,
    @InjectModel(User) private readonly users: typeof User
  ) {}

  async listWorkshopUsers(query: WorkshopUserQueryDto) {
    const where: Record<PropertyKey, unknown> = { isActive: true };
    if (query.q) where[Op.or] = [
      { fullName: { [Op.like]: `%${query.q}%` } },
      { email: { [Op.like]: `%${query.q}%` } }
    ];
    const result = await this.users.findAndCountAll({
      attributes: ['id', 'fullName', 'email', 'isActive'],
      where,
      include: [{ model: Role, attributes: ['code'], where: { code: 'WORKSHOP' }, required: true }],
      order: [['fullName', 'ASC']],
      limit: query.limit,
      offset: (query.page - 1) * query.limit,
      distinct: true
    });
    return {
      data: result.rows.map((user) => ({
        id: user.id,
        name: user.fullName,
        email: user.email,
        active: user.isActive,
        role: user.role?.code
      })),
      pagination: { page: query.page, limit: query.limit, total: result.count, totalPages: Math.ceil(result.count / query.limit) }
    };
  }

  private async validateWorkshopUser(id: string, transaction: Transaction) {
    const user = await this.users.findByPk(id, { include: [{ model: Role, attributes: ['id', 'code'] }], transaction });
    if (!user) throw new NotFoundException('Workshop user not found');
    if (user.role?.code !== 'WORKSHOP') throw new ForbiddenException('Destination user must have the WORKSHOP role');
    if (!user.isActive) throw new BadRequestException('Workshop user is inactive');
    return user;
  }

  private validateOrderItem(orderItem: OrderItem, order: Order) {
    if (orderItem.supplyType !== OrderSupplyType.MADE_TO_ORDER)
      throw new BadRequestException('Only MADE_TO_ORDER order items can be assigned');
    if (orderItem.status !== OrderItemStatus.PENDING_PRODUCTION)
      throw new BadRequestException('Order item must be PENDING_PRODUCTION');
    if (order.status === OrderStatus.CANCELLED || order.status === OrderStatus.COMPLETED)
      throw new BadRequestException('Order cannot receive workshop assignments in its current status');
  }

  async create(dto: CreateWorkshopJobDto, assignedByUserId: string) {
    try {
      return await this.jobs.sequelize!.transaction(async (transaction) => {
        const orderItem = await this.orderItems.findByPk(dto.orderItemId, { transaction, lock: transaction.LOCK.UPDATE });
        if (!orderItem) throw new NotFoundException('Order item not found');
        const order = await this.orders.findByPk(orderItem.orderId, { transaction });
        if (!order) throw new NotFoundException('Order not found');
        this.validateOrderItem(orderItem, order);
        if (await this.jobs.findOne({ where: { orderItemId: orderItem.id }, transaction }))
          throw new ConflictException('Order item already has a workshop job');
        await this.validateWorkshopUser(dto.workshopUserId, transaction);
        const assignedAt = new Date();
        const job = await this.jobs.create({
          code: `TMP-${randomUUID()}`,
          orderItemId: orderItem.id,
          workshopUserId: dto.workshopUserId,
          status: WorkshopJobStatus.ASSIGNED,
          instructions: dto.instructions ?? null,
          expectedCompletionDate: dto.expectedCompletionDate ?? null,
          assignedByUserId,
          assignedAt
        }, { transaction });
        await job.update({ code: `HF-TAL-${assignedAt.getFullYear()}-${String(job.id).padStart(5, '0')}` }, { transaction });
        return this.detail(job.id, transaction);
      });
    } catch (error) {
      if ((error as { name?: string }).name === 'SequelizeUniqueConstraintError')
        throw new ConflictException('Order item already has a workshop job');
      throw error;
    }
  }

  async list(query: WorkshopJobQueryDto) {
    const where: Record<PropertyKey, unknown> = {};
    if (query.workshopUserId) where.workshopUserId = query.workshopUserId;
    if (query.status) where.status = query.status;
    if (query.expectedDateFrom || query.expectedDateTo) where.expectedCompletionDate = {
      ...(query.expectedDateFrom ? { [Op.gte]: query.expectedDateFrom } : {}),
      ...(query.expectedDateTo ? { [Op.lte]: query.expectedDateTo } : {})
    };
    if (query.q) where[Op.or] = [
      { code: { [Op.like]: `%${query.q}%` } },
      { '$workshopUser.full_name$': { [Op.like]: `%${query.q}%` } },
      { '$orderItem.order.code$': { [Op.like]: `%${query.q}%` } },
      { '$orderItem.order.customer.full_name$': { [Op.like]: `%${query.q}%` } }
    ];
    const orderWhere = query.orderId ? { id: query.orderId } : undefined;
    const result = await this.jobs.findAndCountAll({
      attributes: ['id', 'code', 'status', 'expectedCompletionDate', 'assignedAt', 'orderItemId'],
      where,
      include: this.jobIncludes({ orderWhere, detail: false }),
      order: [['assignedAt', 'DESC']],
      limit: query.limit,
      offset: (query.page - 1) * query.limit,
      distinct: true
    });
    return {
      data: result.rows.map((job) => this.serializeList(job)),
      pagination: { page: query.page, limit: query.limit, total: result.count, totalPages: Math.ceil(result.count / query.limit) }
    };
  }

  async detail(id: string, transaction?: Transaction) {
    const job = await this.jobs.findByPk(id, {
      include: this.jobIncludes({ detail: true }),
      transaction
    });
    if (!job) throw new NotFoundException('Workshop job not found');
    return this.serializeDetail(job);
  }

  private jobIncludes({ orderWhere, detail }: { orderWhere?: Record<string, unknown>; detail: boolean }) {
    return [
      { model: User, as: 'workshopUser', attributes: ['id', 'fullName', 'email', 'isActive'] },
      { model: User, as: 'assignedByUser', attributes: ['id', 'fullName', 'email'] },
      {
        model: OrderItem,
        attributes: ['id', 'orderId', 'productNameSnapshot', 'variantNameSnapshot', 'skuSnapshot', 'imageUrlSnapshot', 'customization', 'quantity', 'supplyType', 'status', 'notes'],
        include: [{
          model: Order,
          attributes: detail ? ['id', 'code', 'status', 'promisedDate', 'notes'] : ['id', 'code'],
          where: orderWhere,
          required: Boolean(orderWhere),
          include: [{ model: Customer, attributes: ['id', 'fullName', 'phone'] }]
        }]
      },
      ...(detail ? [{ model: WorkshopProgressReport, as: 'progressReports', attributes: ['id', 'type', 'message', 'progressPercent', 'evidenceUrls', 'reviewStatus', 'submittedAt', 'reviewedAt', 'reviewComment'], separate: true, order: [['submittedAt', 'ASC'], ['id', 'ASC']] }] : [])
    ] as Includeable[];
  }

  private serializeList(job: WorkshopJob) {
    const value = plain<Plain & { orderItem?: Plain & { order?: Plain & { customer?: Plain } }; workshopUser?: Plain }>(job);
    const item = value.orderItem ?? {};
    const order = item.order ?? {};
    return {
      id: value.id,
      code: value.code,
      status: value.status,
      expectedCompletionDate: value.expectedCompletionDate,
      assignedAt: value.assignedAt,
      workshopUser: value.workshopUser,
      orderItemId: value.orderItemId,
      orderId: order.id,
      orderCode: order.code,
      customer: order.customer,
      productNameSnapshot: item.productNameSnapshot, imageUrlSnapshot: item.imageUrlSnapshot,
      variantNameSnapshot: item.variantNameSnapshot,
      quantity: item.quantity
    };
  }

  private serializeDetail(job: WorkshopJob) {
    const value = plain<Plain & { orderItem?: Plain & { order?: Plain }; workshopUser?: Plain; assignedByUser?: Plain; progressReports?: Plain[] }>(job);
    const item = value.orderItem ?? {};
    const order = item.order ?? {};
    return {
      id: value.id,
      code: value.code,
      status: value.status,
      instructions: value.instructions,
      expectedCompletionDate: value.expectedCompletionDate,
      assignedAt: value.assignedAt,
      workshopUser: value.workshopUser,
      assignedByUser: value.assignedByUser,
      order,
      customer: order.customer,
      orderItem: {
        id: item.id,
        productNameSnapshot: item.productNameSnapshot, imageUrlSnapshot: item.imageUrlSnapshot,
        variantNameSnapshot: item.variantNameSnapshot,
        skuSnapshot: item.skuSnapshot,
        customization: item.customization,
        quantity: item.quantity,
        supplyType: item.supplyType,
        status: item.status,
        notes: item.notes
      },
      progressReports: (value.progressReports ?? []).map((report) => ({ id: report.id, type: report.type, message: report.message, progressPercent: report.progressPercent, evidenceUrls: report.evidenceUrls, reviewStatus: report.reviewStatus, submittedAt: report.submittedAt, reviewedAt: report.reviewedAt, reviewComment: report.reviewComment }))
    };
  }
}
