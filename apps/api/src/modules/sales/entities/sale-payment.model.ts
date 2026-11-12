import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript';
import { User } from '../../auth/entities/user.model';
import { Customer } from '../../quotes/entities/customer.model';
import {
  SalePaymentAdjustmentEffect,
  SalePaymentMethod,
  SalePaymentStatus,
  SalePaymentType
} from '../sales.types';
import { Sale } from './sale.model';

@Table({ tableName: 'sale_payments', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' })
export class SalePayment extends Model {
  // Historical rows stay NULL; MySQL permits multiple NULLs in a unique index.
  @Column({ type: DataType.STRING(36), unique: true, field: 'intent_id' })
  declare intentId: string | null;
  @Column({ type: DataType.STRING(64), field: 'intent_fingerprint' })
  declare intentFingerprint: string | null;
  @Column({ type: DataType.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true })
  declare id: string;
  @ForeignKey(() => Sale)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false, field: 'sale_id' })
  declare saleId: string;
  @ForeignKey(() => Customer)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false, field: 'customer_id' })
  declare customerId: string;
  @Column({ type: DataType.ENUM(...Object.values(SalePaymentType)), allowNull: false })
  declare type: SalePaymentType;
  @Column({ type: DataType.ENUM(...Object.values(SalePaymentMethod)), allowNull: false })
  declare method: SalePaymentMethod;
  @Column({ type: DataType.ENUM(...Object.values(SalePaymentAdjustmentEffect)), field: 'adjustment_effect' })
  declare adjustmentEffect: SalePaymentAdjustmentEffect | null;
  @Column({ type: DataType.DECIMAL(12, 2), allowNull: false }) declare amount: string;
  @Column({ type: DataType.DATE, allowNull: false, field: 'paid_at' }) declare paidAt: Date;
  @Column(DataType.STRING(160)) declare reference: string | null;
  @Column(DataType.TEXT) declare notes: string | null;
  @Column({ type: DataType.STRING(500), field: 'evidence_url' }) declare evidenceUrl: string | null;
  @Column({ type: DataType.ENUM(...Object.values(SalePaymentStatus)), allowNull: false, defaultValue: SalePaymentStatus.REGISTERED })
  declare status: SalePaymentStatus;
  @ForeignKey(() => User)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false, field: 'created_by_user_id' })
  declare createdByUserId: string;
  @ForeignKey(() => User)
  @Column({ type: DataType.BIGINT.UNSIGNED, field: 'voided_by_user_id' })
  declare voidedByUserId: string | null;
  @Column({ type: DataType.DATE, field: 'voided_at' }) declare voidedAt: Date | null;
  @Column({ type: DataType.TEXT, field: 'void_reason' }) declare voidReason: string | null;
  @BelongsTo(() => Sale) declare sale?: Sale;
  @BelongsTo(() => Customer) declare customer?: Customer;
  @BelongsTo(() => User, 'createdByUserId') declare createdBy?: User;
  @BelongsTo(() => User, 'voidedByUserId') declare voidedBy?: User;
}
