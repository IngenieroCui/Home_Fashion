import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  HasMany,
  HasOne,
  Model,
  Table
} from 'sequelize-typescript';
import { User } from '../../auth/entities/user.model';
import { Customer } from '../../quotes/entities/customer.model';
import { Quote } from '../../quotes/entities/quote.model';
import { SaleStatus } from '../sales.types';
import { SaleItem } from './sale-item.model';
import { SalePayment } from './sale-payment.model';
import { Order } from '../../orders/entities/order.model';

@Table({ tableName: 'sales', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' })
export class Sale extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true })
  declare id: string;
  @Column({ type: DataType.STRING(30), allowNull: false, unique: true }) declare code: string;
  @ForeignKey(() => Customer)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false, field: 'customer_id' })
  declare customerId: string;
  @ForeignKey(() => Quote)
  @Column({ type: DataType.BIGINT.UNSIGNED, unique: true, field: 'quote_id' })
  declare quoteId: string | null;
  @Column({
    type: DataType.ENUM(...Object.values(SaleStatus)),
    allowNull: false,
    defaultValue: SaleStatus.CONFIRMED
  })
  declare status: SaleStatus;
  @Column({ type: DataType.DECIMAL(12, 2), allowNull: false }) declare subtotal: string;
  @Column({ type: DataType.DECIMAL(12, 2), allowNull: false, field: 'discount_total' })
  declare discountTotal: string;
  @Column({ type: DataType.DECIMAL(12, 2), allowNull: false, field: 'delivery_fee' })
  declare deliveryFee: string;
  @Column({ type: DataType.DECIMAL(12, 2), allowNull: false }) declare total: string;
  @Column(DataType.TEXT) declare notes: string | null;
  @ForeignKey(() => User)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false, field: 'created_by_user_id' })
  declare createdByUserId: string;
  @ForeignKey(() => User)
  @Column({ type: DataType.BIGINT.UNSIGNED, field: 'cancelled_by_user_id' })
  declare cancelledByUserId: string | null;
  @Column({ type: DataType.DATE, field: 'cancelled_at' }) declare cancelledAt: Date | null;
  @Column({ type: DataType.TEXT, field: 'cancellation_reason' }) declare cancellationReason:
    string | null;
  @BelongsTo(() => Customer) declare customer?: Customer;
  @BelongsTo(() => Quote) declare quote?: Quote;
  @BelongsTo(() => User, 'createdByUserId') declare createdByUser?: User;
  @BelongsTo(() => User, 'cancelledByUserId') declare cancelledByUser?: User;
  @HasMany(() => SaleItem) declare items?: SaleItem[];
  @HasMany(() => SalePayment) declare payments?: SalePayment[];
  @HasOne(() => Order) declare order?: Order;
}
