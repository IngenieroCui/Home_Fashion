import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { createHmac } from 'node:crypto';
import { AuthService } from '../auth/auth.service';
import { Sale } from '../sales/entities/sale.model';
import { cents, money } from '../sales/sales-calculations';
import { SalesService } from '../sales/sales.service';
import { SalePaymentMethod, SalePaymentType, SaleStatus } from '../sales/sales.types';
import { PaymentAttempt } from './payment-attempt.model';
import { CreatePaymentAttemptDto } from './payment-attempt.dto';
import { sha256, WompiAdapter, type WompiTransaction } from './wompi.adapter';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectModel(PaymentAttempt) private readonly attempts: typeof PaymentAttempt,
    @InjectModel(Sale) private readonly sales: typeof Sale,
    private readonly financial: SalesService,
    private readonly wompi: WompiAdapter,
    private readonly auth: AuthService
  ) {}
  private async admin(userId: string) {
    const user = await this.auth.getAuthenticatedUser(userId);
    if (
      user.role !== 'ADMIN' ||
      !user.permissions.includes('FINANCIAL_PAYMENT_REGISTER') ||
      !user.permissions.includes('SALE_MANAGE')
    )
      throw new ForbiddenException('Se requiere ADMIN con permisos de ventas y pagos.');
  }
  private token(id: string) {
    return createHmac('sha256', this.wompi.settings().linkSecret)
      .update(`home-fashion:wompi:sandbox:${id}`)
      .digest('base64url');
  }
  private present(attempt: PaymentAttempt) {
    const { publicUrl } = this.wompi.settings();
    return {
      id: attempt.id,
      reference: attempt.reference,
      amount: money(BigInt(attempt.amountInCents)),
      currency: attempt.currency,
      environment: attempt.environment,
      status: attempt.status,
      salePaymentId: attempt.salePaymentId,
      providerTransactionId: attempt.providerTransactionId,
      reviewRequired: attempt.reviewRequired,
      reviewReason: attempt.reviewReason,
      expiresAt: attempt.expiresAt,
      url: `${publicUrl}/cobro/${this.token(attempt.id)}`
    };
  }
  async create(saleId: string, dto: CreatePaymentAttemptDto, userId: string) {
    await this.admin(userId);
    this.wompi.settings();
    const amount = cents(dto.amount);
    if (amount <= 0n || amount > 999_999_999_999n)
      throw new BadRequestException('Importe COP inválido.');
    try {
      return await this.sales.sequelize!.transaction(async (transaction) => {
        const sale = await this.sales.findByPk(saleId, {
          transaction,
          lock: transaction.LOCK.UPDATE
        });
        if (!sale) throw new NotFoundException('Sale not found');
        const existing = await this.attempts.findByPk(dto.intentId, { transaction });
        if (existing) {
          if (
            String(existing.saleId) !== String(sale.id) ||
            String(existing.createdByUserId) !== String(userId) ||
            BigInt(existing.amountInCents) !== amount
          )
            throw new ConflictException('Payment intent already used with different content');
          return this.present(existing);
        }
        const summary = await this.financial.paymentSummary(sale, transaction);
        if (sale.status !== SaleStatus.CONFIRMED || amount > cents(summary.balance))
          throw new BadRequestException(
            'El importe supera el saldo o la venta no está confirmada.'
          );
        const attempt = await this.attempts.create(
          {
            id: dto.intentId,
            saleId: sale.id,
            provider: 'WOMPI',
            reference: `HF-TEST-${dto.intentId}`,
            amountInCents: amount.toString(),
            currency: 'COP',
            environment: 'SANDBOX',
            status: 'PENDING',
            tokenHash: sha256(this.token(dto.intentId)),
            expiresAt: new Date(Date.now() + 24 * 3600_000),
            createdByUserId: userId,
            reviewRequired: false
          },
          { transaction }
        );
        return this.present(attempt);
      });
    } catch (error) {
      if ((error as { name?: string }).name === 'SequelizeUniqueConstraintError')
        throw new ConflictException('Payment intent already used');
      throw error;
    }
  }
  async list(saleId: string, userId: string) {
    await this.admin(userId);
    this.wompi.settings();
    const attempts = await this.attempts.findAll({
      where: { saleId },
      order: [['created_at', 'DESC']],
      limit: 100
    });
    return attempts.map((attempt) => this.present(attempt));
  }
  private async byToken(token: string) {
    if (!/^[a-zA-Z0-9_-]{43}$/.test(token)) throw new NotFoundException('Cobro no disponible.');
    const attempt = await this.attempts.findOne({ where: { tokenHash: sha256(token) } });
    if (!attempt) throw new NotFoundException('Cobro no disponible.');
    return attempt;
  }
  async publicDetail(token: string) {
    const attempt = await this.byToken(token);
    const expired = attempt.expiresAt.getTime() <= Date.now();
    const sale = await this.sales.findByPk(attempt.saleId);
    const summary = sale ? await this.financial.paymentSummary(sale) : null;
    const canPay =
      !expired &&
      !attempt.reviewRequired &&
      attempt.status === 'PENDING' &&
      sale?.status === SaleStatus.CONFIRMED &&
      summary !== null &&
      BigInt(attempt.amountInCents) <= cents(summary.balance);
    return {
      businessName: 'Home Fashion',
      concept: 'Abono de compra',
      amount: money(BigInt(attempt.amountInCents)),
      currency: 'COP',
      environment: 'SANDBOX',
      status: attempt.status,
      expired,
      confirmed: attempt.salePaymentId !== null && attempt.salePaymentId !== undefined,
      reviewRequired: attempt.reviewRequired,
      canPay,
      expiresAt: attempt.expiresAt
    };
  }
  async checkout(token: string) {
    const detail = await this.publicDetail(token);
    if (!detail.canPay) throw new ConflictException('El cobro no está disponible para pago.');
    const attempt = await this.byToken(token);
    return {
      url: this.wompi.checkout(
        attempt.reference,
        String(attempt.amountInCents),
        attempt.expiresAt,
        token
      )
    };
  }
  private matches(attempt: PaymentAttempt, tx: WompiTransaction) {
    if (
      attempt.provider !== 'WOMPI' ||
      attempt.environment !== 'SANDBOX' ||
      attempt.currency !== 'COP' ||
      tx.reference !== attempt.reference ||
      tx.currency !== attempt.currency ||
      BigInt(tx.amount_in_cents) !== BigInt(attempt.amountInCents) ||
      (attempt.providerTransactionId && attempt.providerTransactionId !== tx.id)
    )
      throw new ConflictException('Wompi transaction does not match payment attempt');
  }
  async webhook(body: unknown) {
    const event = this.wompi.verifyEvent(body);
    const incoming = event.data.transaction;
    const found = await this.attempts.findOne({ where: { reference: incoming.reference } });
    if (!found) throw new NotFoundException('Payment attempt not found');
    this.matches(found, incoming);
    // Always use private server credentials and the fixed Sandbox API, including duplicate events.
    // A signed notification is a trigger; the current provider state is authoritative.
    const verified = await this.wompi.transaction(incoming.id);
    if (verified.id !== incoming.id) throw new ConflictException('Wompi transaction ID mismatch');
    this.matches(found, verified);
    return this.sales.sequelize!.transaction(async (transaction) => {
      // All financial operations acquire Sale first, then Attempt/Payment, to serialize with manual payments.
      const sale = await this.sales.findByPk(found.saleId, {
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      const attempt = await this.attempts.findByPk(found.id, {
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      if (!sale || !attempt || String(attempt.saleId) !== String(sale.id))
        throw new ConflictException('Sale association mismatch');
      this.matches(attempt, verified);
      const audit = {
        providerTransactionId: verified.id,
        verifiedAt: new Date(),
        lastEventTimestamp: String(
          Math.max(Number(attempt.lastEventTimestamp ?? 0), event.timestamp)
        )
      };
      // Never downgrade a confirmed approval or reverse internal money automatically.
      if (attempt.salePaymentId) {
        await attempt.update(
          {
            ...audit,
            ...(verified.status === 'VOIDED'
              ? { reviewRequired: true, reviewReason: 'PROVIDER_VOIDED_AFTER_PAYMENT' }
              : {})
          },
          { transaction }
        );
        return { received: true };
      }
      if (verified.status !== 'APPROVED') {
        const status =
          attempt.status === 'APPROVED' ||
          (verified.status === 'PENDING' && attempt.status !== 'PENDING')
            ? attempt.status
            : verified.status;
        await attempt.update({ ...audit, status }, { transaction });
        return { received: true };
      }
      const summary = await this.financial.paymentSummary(sale, transaction);
      if (
        sale.status !== SaleStatus.CONFIRMED ||
        BigInt(attempt.amountInCents) > cents(summary.balance)
      ) {
        await attempt.update(
          {
            ...audit,
            status: 'APPROVED',
            reviewRequired: true,
            reviewReason: 'APPROVED_WITH_INSUFFICIENT_BALANCE_OR_CANCELLED_SALE'
          },
          { transaction }
        );
        return { received: true };
      }
      const result = await this.financial.recordPaymentInTransaction(
        sale,
        {
          intentId: attempt.id,
          type: SalePaymentType.PAYMENT,
          method: SalePaymentMethod.OTHER,
          amount: money(BigInt(attempt.amountInCents)),
          paidAt: new Date(verified.finalized_at!).toISOString(),
          reference: attempt.reference,
          notes: 'Wompi Sandbox: pago ficticio verificado.'
        },
        String(attempt.createdByUserId),
        transaction
      );
      await attempt.update(
        {
          ...audit,
          status: 'APPROVED',
          salePaymentId: String(result.payment.id),
          reviewRequired: false,
          reviewReason: null
        },
        { transaction }
      );
      return { received: true };
    });
  }
}
