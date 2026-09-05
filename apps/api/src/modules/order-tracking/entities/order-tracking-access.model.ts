import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript';
import { User } from '../../auth/entities/user.model';
import { Order } from '../../orders/entities/order.model';

@Table({ tableName: 'order_tracking_accesses', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' })
export class OrderTrackingAccess extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true }) declare id: string;
  @ForeignKey(() => Order)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false, unique: true, field: 'order_id' }) declare orderId: string;
  @Column({ type: DataType.STRING(64), allowNull: false, unique: true, field: 'token_hash' }) declare tokenHash: string;
  @Column({ type: DataType.STRING(16), allowNull: false, field: 'token_prefix' }) declare tokenPrefix: string;
  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true }) declare active: boolean;
  @Column({ type: DataType.DATE, field: 'expires_at' }) declare expiresAt: Date | null;
  @ForeignKey(() => User)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false, field: 'created_by_user_id' }) declare createdByUserId: string;
  @Column({ type: DataType.DATE, field: 'rotated_at' }) declare rotatedAt: Date | null;
  @ForeignKey(() => User)
  @Column({ type: DataType.BIGINT.UNSIGNED, field: 'revoked_by_user_id' }) declare revokedByUserId: string | null;
  @Column({ type: DataType.DATE, field: 'revoked_at' }) declare revokedAt: Date | null;
  @BelongsTo(() => Order) declare order?: Order;
  @BelongsTo(() => User, 'createdByUserId') declare createdByUser?: User;
  @BelongsTo(() => User, 'revokedByUserId') declare revokedByUser?: User;
}
