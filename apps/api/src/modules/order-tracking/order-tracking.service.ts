import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { createHash, createHmac, randomBytes } from 'node:crypto';
import { Transaction } from 'sequelize';
import { AuthService } from '../auth/auth.service';
import { Delivery } from '../deliveries/entities/delivery.model';
import { OrderItem } from '../orders/entities/order-item.model';
import { Order } from '../orders/entities/order.model';
import { ORDER_MANAGE_PERMISSION } from '../orders/orders.types';
import { WorkshopJob } from '../workshop-jobs/entities/workshop-job.model';
import { WorkshopProgressReport } from '../workshop-jobs/entities/workshop-progress-report.model';
import { WorkshopProgressReviewStatus } from '../workshop-jobs/workshop-jobs.types';
import { CreateTrackingAccessDto } from './dto/order-tracking.dto';
import { OrderTrackingAccess } from './entities/order-tracking-access.model';

type Plain = Record<string, unknown>;
const asPlain = <T>(model: { get(options: { plain: true }): T }) => model.get({ plain: true });
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43,}$/;

@Injectable()
export class OrderTrackingService {
  constructor(
    @InjectModel(OrderTrackingAccess) private readonly accesses: typeof OrderTrackingAccess,
    @InjectModel(Order) private readonly orders: typeof Order,
    @InjectModel(Delivery) private readonly deliveries: typeof Delivery,
    private readonly auth: AuthService
  ) {}

  async status(orderId: string, userId: string) {
    await this.requireManage(userId);
    await this.requireOrder(orderId);
    const access = await this.accesses.findOne({ where: { orderId } });
    return access ? this.serializeAdminStatus(access) : { exists: false, active: false };
  }

  async createOrRotate(orderId: string, dto: CreateTrackingAccessDto, userId: string) {
    await this.requireManage(userId);
    const expiresAt = this.validateExpiration(dto.expiresAt);
    const token = randomBytes(32).toString('base64url');
    const tokenHash = this.hashToken(token);
    try {
      return await this.accesses.sequelize!.transaction(async (transaction) => {
        await this.requireOrder(orderId, transaction, true);
        const access = await this.accesses.findOne({
          where: { orderId },
          transaction,
          lock: transaction.LOCK.UPDATE
        });
        const now = new Date();
        if (!access) {
          const created = await this.accesses.create(
            {
              orderId,
              tokenHash,
              tokenPrefix: this.tokenPrefix(token),
              active: true,
              expiresAt,
              createdByUserId: userId,
              rotatedAt: null,
              revokedByUserId: null,
              revokedAt: null
            },
            { transaction }
          );
          return this.serializeTokenResponse(token, created);
        }
        await access.update(
          {
            tokenHash,
            tokenPrefix: this.tokenPrefix(token),
            active: true,
            expiresAt,
            rotatedAt: now,
            revokedByUserId: null,
            revokedAt: null
          },
          { transaction }
        );
        return this.serializeTokenResponse(token, access);
      });
    } catch (error) {
      if ((error as { name?: string }).name === 'SequelizeUniqueConstraintError')
        throw new ConflictException('Tracking access changed concurrently');
      throw error;
    }
  }

  async revoke(orderId: string, userId: string) {
    await this.requireManage(userId);
    return this.accesses.sequelize!.transaction(async (transaction) => {
      await this.requireOrder(orderId, transaction, true);
      const access = await this.accesses.findOne({
        where: { orderId },
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      if (!access) throw new NotFoundException('Tracking access not found');
      if (access.active)
        await access.update(
          { active: false, revokedByUserId: userId, revokedAt: new Date() },
          { transaction }
        );
      return this.serializeAdminStatus(access);
    });
  }

  async publicLookup(token: string) {
    if (!TOKEN_PATTERN.test(token)) throw new BadRequestException('Invalid tracking token');
    const access = await this.accesses.findOne({
      where: { tokenHash: this.hashToken(token), active: true },
      include: [
        {
          model: Order,
          attributes: ['code', 'status', 'promisedDate', ['created_at', 'createdAt']],
          required: true,
          include: [
            {
              model: OrderItem,
              attributes: [
                'id',
                'productNameSnapshot',
                'imageUrlSnapshot',
                'variantNameSnapshot',
                'skuSnapshot',
                'customization',
                'quantity',
                'supplyType',
                'status'
              ],
              include: [
                {
                  model: WorkshopJob,
                  attributes: ['expectedCompletionDate'],
                  required: false,
                  include: [
                    {
                      model: WorkshopProgressReport,
                      as: 'progressReports',
                      attributes: [
                        'id',
                        'type',
                        'message',
                        'progressPercent',
                        'evidenceUrls',
                        'submittedAt',
                        'reviewedAt'
                      ],
                      where: { reviewStatus: WorkshopProgressReviewStatus.APPROVED },
                      required: false
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    });
    if (!access || (access.expiresAt && access.expiresAt.getTime() <= Date.now()))
      throw new NotFoundException('Tracking resource not found');
    const delivery = await this.deliveries.findOne({
      where: { orderId: access.orderId },
      attributes: [
        'status',
        'scheduledDate',
        'timeWindow',
        'deliveredAt',
        'evidenceUrls',
        ['created_at', 'createdAt'],
        ['updated_at', 'updatedAt']
      ]
    });
    const safeDelivery =
      delivery && delivery.status !== 'CANCELLED'
        ? {
            status: delivery.status,
            scheduledDate: delivery.scheduledDate,
            timeWindow: delivery.timeWindow,
            deliveredAt: delivery.deliveredAt,
            evidenceUrls: delivery.status === 'DELIVERED' ? delivery.evidenceUrls : null
          }
        : null;
    const projection = this.serializePublicOrder(access);
    const order = asPlain<Plain & { order?: Plain }>(access).order;
    const dates = [
      order?.createdAt,
      ...projection.items.flatMap((item) => item.timeline.map((entry) => entry.approvedAt)),
      // Delivery writes are public scheduling/status events, including cancellation.
      // General order.updatedAt is intentionally excluded for internal-only edits.
      delivery?.getDataValue('updatedAt') ?? delivery?.getDataValue('updated_at'),
      delivery?.getDataValue('createdAt') ?? delivery?.getDataValue('created_at'),
      safeDelivery?.deliveredAt
    ]
      .filter((date) => date != null)
      .map((date) => new Date(String(date)).getTime())
      .filter(Number.isFinite);
    const lastPublicUpdateAt = dates.length
      ? new Date(Math.max(...dates)).toISOString()
      : undefined;
    return { ...projection, delivery: safeDelivery, lastPublicUpdateAt };
  }

  private async requireManage(userId: string) {
    const user = await this.auth.getAuthenticatedUser(userId);
    if (!user.permissions.includes(ORDER_MANAGE_PERMISSION))
      throw new ForbiddenException('Missing required permission');
  }

  private async requireOrder(orderId: string, transaction?: Transaction, lock = false) {
    const order = await this.orders.findByPk(orderId, {
      transaction,
      ...(lock ? { lock: transaction!.LOCK.UPDATE } : {})
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  private validateExpiration(value?: string) {
    if (!value) return null;
    const expiration = new Date(value);
    if (Number.isNaN(expiration.getTime()) || expiration.getTime() <= Date.now())
      throw new BadRequestException('expiresAt must be a future date');
    return expiration;
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
  private tokenPrefix(token: string) {
    return token.slice(0, 8);
  }

  private serializeAdminStatus(access: OrderTrackingAccess) {
    return {
      exists: true,
      active: access.active,
      tokenPrefix: access.tokenPrefix,
      expiresAt: access.expiresAt,
      createdAt: access.createdAt,
      rotatedAt: access.rotatedAt,
      revokedAt: access.revokedAt
    };
  }

  private serializeTokenResponse(token: string, access: OrderTrackingAccess) {
    return {
      token,
      path: `/seguimiento/${token}`,
      active: access.active,
      expiresAt: access.expiresAt,
      ...(access.rotatedAt ? { rotatedAt: access.rotatedAt } : { createdAt: access.createdAt })
    };
  }

  private serializePublicOrder(access: OrderTrackingAccess) {
    const value = asPlain<Plain & { order?: Plain & { items?: Plain[] } }>(access);
    const order = value.order!;
    return {
      orderCode: order.code,
      orderStatus: order.status,
      promisedDate: order.promisedDate,
      createdAt: order.createdAt,
      items: (order.items ?? []).map((item) => this.serializePublicItem(item, access))
    };
  }

  private serializePublicItem(item: Plain, access: OrderTrackingAccess) {
    const job = item.workshopJob as Plain | null | undefined;
    const reports = ((job?.progressReports as Plain[] | undefined) ?? [])
      .sort((left, right) => this.reportOrder(left, right))
      .map((report) => ({
        type: report.type,
        message: report.message,
        progressPercent: report.progressPercent,
        evidenceUrls: report.evidenceUrls,
        submittedAt: report.submittedAt,
        approvedAt: report.reviewedAt ?? null
      }));
    return {
      publicItemKey: createHmac('sha256', access.tokenHash)
        .update(String(access.orderId) + ':' + String(item.id))
        .digest('base64url')
        .slice(0, 22),
      productNameSnapshot: item.productNameSnapshot,
      imageUrlSnapshot: item.imageUrlSnapshot ?? null,
      variantNameSnapshot: item.variantNameSnapshot ?? null,
      skuSnapshot: item.skuSnapshot ?? null,
      customization: this.cleanCustomization(item.customization),
      quantity: item.quantity,
      supplyType: item.supplyType,
      status: item.status,
      expectedCompletionDate: job?.expectedCompletionDate ?? null,
      timeline: reports
    };
  }

  private cleanCustomization(value: unknown) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const publicFields = new Set([
      'dimensions',
      'seats',
      'material',
      'fabric',
      'color',
      'finish',
      'details',
      'observations',
      'accessRestrictions'
    ]);
    const entries = Object.entries(value as Record<string, unknown>).filter(
      ([key, field]) =>
        publicFields.has(key) &&
        ((typeof field === 'string' && field.trim() !== '') ||
          (typeof field === 'number' && Number.isFinite(field)))
    );
    return entries.length ? Object.fromEntries(entries) : null;
  }

  private reportOrder(left: Plain, right: Plain) {
    const date =
      new Date(String(left.submittedAt)).getTime() - new Date(String(right.submittedAt)).getTime();
    if (date) return date;
    return BigInt(String(left.id)) < BigInt(String(right.id))
      ? -1
      : BigInt(String(left.id)) > BigInt(String(right.id))
        ? 1
        : 0;
  }
}
