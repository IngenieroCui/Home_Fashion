import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript';
import { Sale } from '../sales/entities/sale.model';
import { SalePayment } from '../sales/entities/sale-payment.model';
import { User } from '../auth/entities/user.model';

export const attemptStatuses = ['PENDING', 'APPROVED', 'DECLINED', 'ERROR', 'VOIDED'] as const;
export type AttemptStatus = (typeof attemptStatuses)[number];

@Table({
  tableName: 'payment_attempts',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
})
export class PaymentAttempt extends Model {
  @Column({ type: DataType.STRING(36), primaryKey: true }) declare id: string;
  @ForeignKey(() => Sale)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false, field: 'sale_id' })
  declare saleId: string;
  @Column({ type: DataType.STRING(12), allowNull: false }) declare provider: 'WOMPI';
  @Column({ type: DataType.STRING(80), unique: true, allowNull: false }) declare reference: string;
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false, field: 'amount_in_cents' })
  declare amountInCents: string;
  @Column({ type: DataType.STRING(3), allowNull: false }) declare currency: 'COP';
  @Column({ type: DataType.STRING(12), allowNull: false }) declare environment: 'SANDBOX';
  @Column({ type: DataType.ENUM(...attemptStatuses), allowNull: false })
  declare status: AttemptStatus;
  @Column({ type: DataType.STRING(160), unique: true, field: 'provider_transaction_id' })
  declare providerTransactionId: string | null;
  @ForeignKey(() => SalePayment)
  @Column({ type: DataType.BIGINT.UNSIGNED, unique: true, field: 'sale_payment_id' })
  declare salePaymentId: string | null;
  @Column({ type: DataType.STRING(64), unique: true, allowNull: false, field: 'token_hash' })
  declare tokenHash: string;
  @Column({ type: DataType.DATE, allowNull: false, field: 'expires_at' }) declare expiresAt: Date;
  @ForeignKey(() => User)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false, field: 'created_by_user_id' })
  declare createdByUserId: string;
  @Column({ type: DataType.DATE, field: 'verified_at' }) declare verifiedAt: Date | null;
  @Column({ type: DataType.BIGINT.UNSIGNED, field: 'last_event_timestamp' })
  declare lastEventTimestamp: string | null;
  @Column({
    type: DataType.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'review_required'
  })
  declare reviewRequired: boolean;
  @Column({ type: DataType.STRING(80), field: 'review_reason' }) declare reviewReason:
    string | null;
  @BelongsTo(() => Sale) declare sale?: Sale;
  @BelongsTo(() => SalePayment) declare salePayment?: SalePayment;
  @BelongsTo(() => User) declare createdBy?: User;
}
