import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, Transaction, type Includeable } from 'sequelize';
import { Role } from '../auth/entities/role.model';
import { User } from '../auth/entities/user.model';
import { Customer } from '../quotes/entities/customer.model';
import { OrderItem } from '../orders/entities/order-item.model';
import { Order } from '../orders/entities/order.model';
import { OrderItemStatus } from '../orders/orders.types';
import { recalculateOrderStatus } from '../orders/order-state';
import { WorkshopJob } from './entities/workshop-job.model';
import { WorkshopProgressReport } from './entities/workshop-progress-report.model';
import { AdminWorkshopProgressQueryDto, ReviewWorkshopProgressDto, SubmitWorkshopProgressDto, WorkshopOwnJobsQueryDto, WorkshopProgressReviewDecision } from './dto/workshop-progress.dto';
import { WorkshopJobStatus, WorkshopProgressReportType, WorkshopProgressReviewStatus } from './workshop-jobs.types';

type Plain = Record<string, unknown>;
const asPlain = <T>(model: { get(options: { plain: true }): T }) => model.get({ plain: true });

@Injectable()
export class WorkshopProgressService {
  constructor(
    @InjectModel(WorkshopJob) private readonly jobs: typeof WorkshopJob,
    @InjectModel(WorkshopProgressReport) private readonly reports: typeof WorkshopProgressReport,
    @InjectModel(OrderItem) private readonly orderItems: typeof OrderItem,
    @InjectModel(Order) private readonly orders: typeof Order,
    @InjectModel(User) private readonly users: typeof User
  ) {}

  async listOwnJobs(userId: string, query: WorkshopOwnJobsQueryDto) {
    const where: Record<PropertyKey, unknown> = { workshopUserId: userId };
    if (query.status) where.status = query.status;
    if (query.q) where[Op.or] = [{ code: { [Op.like]: `%${query.q}%` } }, { '$orderItem.order.code$': { [Op.like]: `%${query.q}%` } }, { '$orderItem.product_name_snapshot$': { [Op.like]: `%${query.q}%` } }];
    const result = await this.jobs.findAndCountAll({
      attributes: ['id', 'code', 'status', 'instructions', 'expectedCompletionDate', 'assignedAt', 'orderItemId'], where,
      include: this.jobIncludes({ reports: { separate: true, limit: 1 } }), order: [['assignedAt', 'DESC']], limit: query.limit, offset: (query.page - 1) * query.limit, distinct: true
    });
    return { data: result.rows.map((job) => this.serializeOwnJob(job, false)), pagination: this.pagination(query.page, query.limit, result.count) };
  }

  async ownJobDetail(userId: string, id: string) {
    const job = await this.jobs.findOne({ where: { id, workshopUserId: userId }, include: this.jobIncludes({ reports: { separate: true } }) });
    if (!job) throw new NotFoundException('Workshop job not found');
    return this.serializeOwnJob(job, true);
  }

  async submit(userId: string, id: string, dto: SubmitWorkshopProgressDto) {
    return this.reports.sequelize!.transaction(async (transaction) => {
      await this.ensureWorkshopUser(userId, transaction);
      const job = await this.jobs.findOne({ where: { id, workshopUserId: userId }, transaction, lock: transaction.LOCK.UPDATE });
      if (!job) throw new NotFoundException('Workshop job not found');
      const item = await this.orderItems.findByPk(job.orderItemId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!item) throw new NotFoundException('Order item not found');
      this.validateSubmission(job, item, dto);
      const report = await this.reports.create({ workshopJobId: job.id, type: dto.type, message: dto.message, progressPercent: dto.type === WorkshopProgressReportType.READY_FOR_REVIEW ? 100 : dto.progressPercent ?? null, evidenceUrls: dto.evidenceUrls ?? null, reviewStatus: WorkshopProgressReviewStatus.PENDING_REVIEW, submittedByUserId: userId, submittedAt: new Date(), reviewedByUserId: null, reviewedAt: null, reviewComment: null }, { transaction });
      if (dto.type === WorkshopProgressReportType.STARTED) {
        await job.update({ status: WorkshopJobStatus.IN_PROGRESS }, { transaction });
        await item.update({ status: OrderItemStatus.IN_PRODUCTION }, { transaction });
        await this.recalculateOrder(item.orderId, transaction);
      } else if (dto.type === WorkshopProgressReportType.READY_FOR_REVIEW) {
        await job.update({ status: WorkshopJobStatus.READY_FOR_REVIEW }, { transaction });
      }
      return this.serializeReport(report);
    });
  }

  async listAdmin(query: AdminWorkshopProgressQueryDto) {
    const where: Record<PropertyKey, unknown> = {};
    if (query.reviewStatus) where.reviewStatus = query.reviewStatus;
    if (query.type) where.type = query.type;
    if (query.dateFrom || query.dateTo) where.submittedAt = { ...(query.dateFrom ? { [Op.gte]: new Date(`${query.dateFrom}T00:00:00.000Z`) } : {}), ...(query.dateTo ? { [Op.lte]: new Date(`${query.dateTo}T23:59:59.999Z`) } : {}) };
    if (query.q) where[Op.or] = [{ '$workshopJob.code$': { [Op.like]: `%${query.q}%` } }, { '$workshopJob.orderItem.order.code$': { [Op.like]: `%${query.q}%` } }, { '$workshopJob.orderItem.order.customer.full_name$': { [Op.like]: `%${query.q}%` } }, { '$workshopJob.orderItem.product_name_snapshot$': { [Op.like]: `%${query.q}%` } }];
    const jobWhere: Record<string, unknown> = {};
    if (query.workshopUserId) jobWhere.workshopUserId = query.workshopUserId;
    const itemWhere: Record<string, unknown> = {};
    const orderWhere: Record<string, unknown> = {};
    if (query.orderId) orderWhere.id = query.orderId;
    const result = await this.reports.findAndCountAll({ attributes: ['id', 'type', 'message', 'progressPercent', 'reviewStatus', 'submittedAt', 'workshopJobId'], where, include: this.reportIncludes({ jobWhere, itemWhere, orderWhere }), order: [['submittedAt', 'DESC']], limit: query.limit, offset: (query.page - 1) * query.limit, distinct: true });
    return { data: result.rows.map((report) => this.serializeAdminList(report)), pagination: this.pagination(query.page, query.limit, result.count) };
  }

  async adminDetail(id: string) {
    const report = await this.reports.findByPk(id, { include: this.reportIncludes({ detail: true }) });
    if (!report) throw new NotFoundException('Workshop progress report not found');
    return this.serializeAdminDetail(report);
  }

  async review(id: string, reviewerId: string, dto: ReviewWorkshopProgressDto) {
    try {
      return await this.reports.sequelize!.transaction(async (transaction) => {
        const report = await this.reports.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
        if (!report) throw new NotFoundException('Workshop progress report not found');
        if (report.reviewStatus !== WorkshopProgressReviewStatus.PENDING_REVIEW) throw new BadRequestException('Workshop progress report has already been reviewed');
        const job = await this.jobs.findByPk(report.workshopJobId, { transaction, lock: transaction.LOCK.UPDATE });
        if (!job) throw new NotFoundException('Workshop job not found');
        const changes = { reviewStatus: dto.decision === WorkshopProgressReviewDecision.APPROVE ? WorkshopProgressReviewStatus.APPROVED : WorkshopProgressReviewStatus.REJECTED, reviewedByUserId: reviewerId, reviewedAt: new Date(), reviewComment: dto.comment?.trim() || null };
        if (report.type === WorkshopProgressReportType.READY_FOR_REVIEW) {
          const item = await this.orderItems.findByPk(job.orderItemId, { transaction, lock: transaction.LOCK.UPDATE });
          if (!item) throw new NotFoundException('Order item not found');
          if (job.status !== WorkshopJobStatus.READY_FOR_REVIEW || item.status !== OrderItemStatus.IN_PRODUCTION) throw new ConflictException('Workshop job state changed concurrently');
          await item.update({ status: dto.decision === WorkshopProgressReviewDecision.APPROVE ? OrderItemStatus.READY : OrderItemStatus.IN_PRODUCTION }, { transaction });
          await job.update({ status: dto.decision === WorkshopProgressReviewDecision.APPROVE ? WorkshopJobStatus.COMPLETED : WorkshopJobStatus.IN_PROGRESS }, { transaction });
          await this.recalculateOrder(item.orderId, transaction);
        }
        await report.update(changes, { transaction });
        return this.serializeReport(report);
      });
    } catch (error) {
      if ((error as { name?: string }).name === 'SequelizeOptimisticLockError') throw new ConflictException('Workshop progress report was reviewed concurrently');
      throw error;
    }
  }

  private async ensureWorkshopUser(userId: string, transaction: Transaction) {
    const user = await this.users.findByPk(userId, { include: [Role], transaction });
    if (!user || !user.isActive) throw new ForbiddenException('Workshop user is inactive');
    if (user.role?.code !== 'WORKSHOP') throw new ForbiddenException('Only WORKSHOP users can submit progress');
  }

  private async recalculateOrder(orderId: string, transaction: Transaction) {
    const order = await this.orders.findByPk(orderId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!order) throw new NotFoundException('Order not found');
    const items = await this.orderItems.findAll({
      where: { orderId }, transaction, lock: transaction.LOCK.UPDATE, order: [['id', 'ASC']]
    });
    await recalculateOrderStatus(order, items, transaction);
  }

  private validateSubmission(job: WorkshopJob, item: OrderItem, dto: SubmitWorkshopProgressDto) {
    if (job.status === WorkshopJobStatus.COMPLETED || job.status === WorkshopJobStatus.CANCELLED || item.status === OrderItemStatus.READY || item.status === OrderItemStatus.CANCELLED) throw new BadRequestException('Workshop job is no longer available for progress reports');
    if (dto.type === WorkshopProgressReportType.STARTED) {
      if (job.status !== WorkshopJobStatus.ASSIGNED || item.status !== OrderItemStatus.PENDING_PRODUCTION) throw new BadRequestException('STARTED is incompatible with the current workshop job state');
      if (dto.progressPercent !== undefined && dto.progressPercent > 99) throw new BadRequestException('STARTED progress percent must be between 0 and 99');
    }
    if (dto.type === WorkshopProgressReportType.PROGRESS) {
      if (job.status !== WorkshopJobStatus.IN_PROGRESS || item.status !== OrderItemStatus.IN_PRODUCTION) throw new BadRequestException('PROGRESS is incompatible with the current workshop job state');
      if (dto.progressPercent !== undefined && (dto.progressPercent < 1 || dto.progressPercent > 99)) throw new BadRequestException('PROGRESS percent must be between 1 and 99');
    }
    if (dto.type === WorkshopProgressReportType.READY_FOR_REVIEW && (job.status !== WorkshopJobStatus.IN_PROGRESS || item.status !== OrderItemStatus.IN_PRODUCTION)) throw new BadRequestException('READY_FOR_REVIEW is incompatible with the current workshop job state');
  }

  private jobIncludes({ reports }: { reports?: { separate: true; limit?: number } }) {
    return [{ model: OrderItem, attributes: ['id', 'orderId', 'productNameSnapshot', 'variantNameSnapshot', 'skuSnapshot', 'customization', 'quantity', 'status', 'notes'], include: [{ model: Order, attributes: ['id', 'code'] }] }, ...(reports ? [{ model: WorkshopProgressReport, as: 'progressReports', attributes: ['id', 'type', 'message', 'progressPercent', 'evidenceUrls', 'reviewStatus', 'submittedAt', 'reviewedAt', 'reviewComment'], separate: true, limit: reports.limit, order: [['submittedAt', 'DESC'], ['id', 'DESC']] }] : [])] as Includeable[];
  }

  private reportIncludes({ jobWhere = {}, orderWhere = {}, detail = false }: { jobWhere?: Record<string, unknown>; itemWhere?: Record<string, unknown>; orderWhere?: Record<string, unknown>; detail?: boolean }) {
    return [{ model: User, as: 'submittedByUser', attributes: ['id', 'fullName', 'email'] }, { model: User, as: 'reviewedByUser', attributes: ['id', 'fullName', 'email'], required: false }, { model: WorkshopJob, attributes: detail ? ['id', 'code', 'status', 'instructions', 'expectedCompletionDate', 'assignedAt', 'workshopUserId'] : ['id', 'code', 'status', 'orderItemId'], where: jobWhere, required: Boolean(Object.keys(jobWhere).length), include: [{ model: User, as: 'workshopUser', attributes: ['id', 'fullName', 'email'] }, { model: OrderItem, attributes: ['id', 'orderId', 'productNameSnapshot', 'variantNameSnapshot', 'skuSnapshot', 'customization', 'quantity', 'status', 'notes'], include: [{ model: Order, attributes: ['id', 'code'], where: orderWhere, required: Boolean(Object.keys(orderWhere).length), include: [{ model: Customer, attributes: ['id', 'fullName', 'phone'] }] }] }] }] as Includeable[];
  }

  private serializeOwnJob(job: WorkshopJob, detail: boolean) {
    const value = asPlain<Plain & { orderItem?: Plain & { order?: Plain }; progressReports?: Plain[] }>(job); const item = value.orderItem ?? {}; const order = item.order ?? {};
    const reports = (value.progressReports ?? []).map((report) => this.publicReport(report));
    return { id: value.id, code: value.code, status: value.status, instructions: value.instructions, expectedCompletionDate: value.expectedCompletionDate, assignedAt: value.assignedAt, order: { id: order.id, code: order.code }, productNameSnapshot: item.productNameSnapshot, variantNameSnapshot: item.variantNameSnapshot, skuSnapshot: item.skuSnapshot, quantity: item.quantity, customization: item.customization, orderItemStatus: item.status, ...(detail ? { notes: item.notes, progressReports: reports.reverse() } : { latestReport: reports[0] ?? null }) };
  }

  private publicReport(report: Plain) { return { id: report.id, type: report.type, message: report.message, progressPercent: report.progressPercent, evidenceUrls: report.evidenceUrls, reviewStatus: report.reviewStatus, submittedAt: report.submittedAt, reviewedAt: report.reviewedAt, reviewComment: report.reviewComment }; }
  private serializeReport(report: WorkshopProgressReport) { return this.publicReport(asPlain<Plain>(report)); }
  private serializeAdminList(report: WorkshopProgressReport) { const value = asPlain<Plain & { workshopJob?: Plain & { workshopUser?: Plain; orderItem?: Plain & { order?: Plain & { customer?: Plain } } } }>(report); const job = value.workshopJob ?? {}; const item = job.orderItem ?? {}; const order = item.order ?? {}; return { id: value.id, type: value.type, message: String(value.message).slice(0, 240), progressPercent: value.progressPercent, reviewStatus: value.reviewStatus, submittedAt: value.submittedAt, workshop: job.workshopUser, workshopJob: { id: job.id, code: job.code, status: job.status }, order: { id: order.id, code: order.code }, customer: order.customer, product: { name: item.productNameSnapshot, variant: item.variantNameSnapshot, sku: item.skuSnapshot }, quantity: item.quantity }; }
  private serializeAdminDetail(report: WorkshopProgressReport) { const value = asPlain<Plain & { workshopJob?: Plain & { workshopUser?: Plain; orderItem?: Plain & { order?: Plain & { customer?: Plain } } }; submittedByUser?: Plain; reviewedByUser?: Plain }>(report); const job = value.workshopJob ?? {}; const item = job.orderItem ?? {}; const order = item.order ?? {}; return { ...this.publicReport(value), submittedByUser: value.submittedByUser, reviewedByUser: value.reviewedByUser, workshop: job.workshopUser, workshopJob: { id: job.id, code: job.code, status: job.status, instructions: job.instructions, expectedCompletionDate: job.expectedCompletionDate, assignedAt: job.assignedAt }, order: { id: order.id, code: order.code }, customer: order.customer, orderItem: { id: item.id, productNameSnapshot: item.productNameSnapshot, variantNameSnapshot: item.variantNameSnapshot, skuSnapshot: item.skuSnapshot, customization: item.customization, quantity: item.quantity, notes: item.notes, status: item.status } }; }
  private pagination(page: number, limit: number, total: number) { return { page, limit, total, totalPages: Math.ceil(total / limit) }; }
}
