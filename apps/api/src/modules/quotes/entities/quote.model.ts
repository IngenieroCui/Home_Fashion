import { BelongsTo, Column, DataType, ForeignKey, HasMany, Model, Table } from 'sequelize-typescript';
import { User } from '../../auth/entities/user.model'; import { Customer } from './customer.model'; import { QuoteItem } from './quote-item.model'; import { QuoteStatus } from '../quotes.types';
@Table({ tableName: 'quotes', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' }) export class Quote extends Model {
 @Column({ type: DataType.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true }) declare id: string; @Column({ type: DataType.STRING(30), allowNull: false, unique: true }) declare code: string;
 @Column({ type: DataType.STRING(36), allowNull: true, unique: true, field: 'public_request_key' }) declare publicRequestKey: string | null;
 @Column({ type: DataType.STRING(64), allowNull: true, field: 'public_request_payload_hash' }) declare publicRequestPayloadHash: string | null;
 @ForeignKey(() => Customer) @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false, field: 'customer_id' }) declare customerId: string;
 @Column({ type: DataType.ENUM(...Object.values(QuoteStatus)), allowNull: false, defaultValue: QuoteStatus.DRAFT }) declare status: QuoteStatus;
 @Column({ type: DataType.DATE, field: 'valid_until' }) declare validUntil: Date | null; @Column({ type: DataType.TEXT, field: 'customer_notes' }) declare customerNotes: string | null; @Column({ type: DataType.TEXT, field: 'internal_notes' }) declare internalNotes: string | null;
 @Column({ type: DataType.DECIMAL(12, 2), allowNull: false, defaultValue: '0.00', field: 'delivery_fee' }) declare deliveryFee: string;
 @Column(DataType.DECIMAL(12, 2)) declare subtotal: string | null; @Column({ type: DataType.DECIMAL(12, 2), field: 'discount_total' }) declare discountTotal: string | null; @Column(DataType.DECIMAL(12, 2)) declare total: string | null;
 @ForeignKey(() => User) @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: true, field: 'created_by_user_id' }) declare createdByUserId: string | null; @ForeignKey(() => User) @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: true, field: 'updated_by_user_id' }) declare updatedByUserId: string | null;
 @BelongsTo(() => Customer) declare customer?: Customer; @HasMany(() => QuoteItem) declare items?: QuoteItem[];
}
