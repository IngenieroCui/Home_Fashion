import { BelongsTo, Column, DataType, ForeignKey, HasMany, HasOne, Model, Table } from 'sequelize-typescript';
import { User } from '../../auth/entities/user.model';
import { Customer } from '../../quotes/entities/customer.model';
import { Sale } from '../../sales/entities/sale.model';
import { OrderStatus } from '../orders.types';
import { OrderItem } from './order-item.model';
import { OrderTrackingAccess } from '../../order-tracking/entities/order-tracking-access.model';

@Table({ tableName: 'orders', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' })
export class Order extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true }) declare id: string;
  @Column({ type: DataType.STRING(30), allowNull: false, unique: true }) declare code: string;
  @ForeignKey(() => Sale)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false, unique: true, field: 'sale_id' }) declare saleId: string;
  @ForeignKey(() => Customer)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false, field: 'customer_id' }) declare customerId: string;
  @Column({ type: DataType.ENUM(...Object.values(OrderStatus)), allowNull: false, defaultValue: OrderStatus.OPEN }) declare status: OrderStatus;
  @Column({ type: DataType.DATEONLY, field: 'promised_date' }) declare promisedDate: string | null;
  @Column(DataType.TEXT) declare notes: string | null;
  @ForeignKey(() => User)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false, field: 'created_by_user_id' }) declare createdByUserId: string;
  @BelongsTo(() => Sale) declare sale?: Sale;
  @BelongsTo(() => Customer) declare customer?: Customer;
  @BelongsTo(() => User, 'createdByUserId') declare createdByUser?: User;
  @HasMany(() => OrderItem) declare items?: OrderItem[];
  @HasOne(() => OrderTrackingAccess) declare trackingAccess?: OrderTrackingAccess;
}
