import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript';
import { User } from '../../auth/entities/user.model';
import { Order } from '../../orders/entities/order.model';
import { DeliveryStatus, DeliveryType } from '../deliveries.types';

@Table({ tableName: 'deliveries', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' })
export class Delivery extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true }) declare id: string;
  @Column({ type: DataType.STRING(50), allowNull: false, unique: true }) declare code: string;
  @ForeignKey(() => Order)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false, unique: true, field: 'order_id' }) declare orderId: string;
  @Column({ type: DataType.ENUM(...Object.values(DeliveryStatus)), allowNull: false, defaultValue: DeliveryStatus.SCHEDULED }) declare status: DeliveryStatus;
  @Column({ type: DataType.STRING(500), allowNull: false }) declare address: string;
  @Column({ type: DataType.STRING(255), field: 'address_reference' }) declare addressReference: string | null;
  @Column({ type: DataType.STRING(160), allowNull: false, field: 'contact_name' }) declare contactName: string;
  @Column({ type: DataType.STRING(40), allowNull: false, field: 'contact_phone' }) declare contactPhone: string;
  @Column({ type: DataType.DATEONLY, allowNull: false, field: 'scheduled_date' }) declare scheduledDate: string;
  @Column({ type: DataType.STRING(80), field: 'time_window' }) declare timeWindow: string | null;
  @Column({ type: DataType.ENUM(...Object.values(DeliveryType)), allowNull: false, field: 'delivery_type' }) declare deliveryType: DeliveryType;
  @ForeignKey(() => User)
  @Column({ type: DataType.BIGINT.UNSIGNED, field: 'assigned_user_id' }) declare assignedUserId: string | null;
  @Column({ type: DataType.STRING(160), field: 'external_driver_name' }) declare externalDriverName: string | null;
  @Column({ type: DataType.DECIMAL(12, 2) }) declare fee: string | null;
  @Column(DataType.TEXT) declare notes: string | null;
  @Column({ type: DataType.STRING(160), field: 'receiver_name' }) declare receiverName: string | null;
  @Column({ type: DataType.JSON, field: 'evidence_urls' }) declare evidenceUrls: string[] | null;
  @Column({ type: DataType.DATE, field: 'delivered_at' }) declare deliveredAt: Date | null;
  @ForeignKey(() => User)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false, field: 'created_by_user_id' }) declare createdByUserId: string;
  @BelongsTo(() => Order) declare order?: Order;
  @BelongsTo(() => User, 'assignedUserId') declare assignedUser?: User;
  @BelongsTo(() => User, 'createdByUserId') declare createdByUser?: User;
}
