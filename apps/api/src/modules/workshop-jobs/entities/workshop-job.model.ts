import { BelongsTo, Column, DataType, ForeignKey, HasMany, Model, Table } from 'sequelize-typescript';
import { User } from '../../auth/entities/user.model';
import { OrderItem } from '../../orders/entities/order-item.model';
import { WorkshopJobStatus } from '../workshop-jobs.types';
import { WorkshopProgressReport } from './workshop-progress-report.model';

@Table({ tableName: 'workshop_jobs', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' })
export class WorkshopJob extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true }) declare id: string;
  @Column({ type: DataType.STRING(50), allowNull: false, unique: true }) declare code: string;
  @ForeignKey(() => OrderItem)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false, unique: true, field: 'order_item_id' }) declare orderItemId: string;
  @ForeignKey(() => User)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false, field: 'workshop_user_id' }) declare workshopUserId: string;
  @Column({ type: DataType.ENUM(...Object.values(WorkshopJobStatus)), allowNull: false, defaultValue: WorkshopJobStatus.ASSIGNED }) declare status: WorkshopJobStatus;
  @Column(DataType.TEXT) declare instructions: string | null;
  @Column({ type: DataType.DATEONLY, field: 'expected_completion_date' }) declare expectedCompletionDate: string | null;
  @ForeignKey(() => User)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false, field: 'assigned_by_user_id' }) declare assignedByUserId: string;
  @Column({ type: DataType.DATE, allowNull: false, field: 'assigned_at' }) declare assignedAt: Date;
  @BelongsTo(() => OrderItem) declare orderItem?: OrderItem;
  @BelongsTo(() => User, 'workshopUserId') declare workshopUser?: User;
  @BelongsTo(() => User, 'assignedByUserId') declare assignedByUser?: User;
  @HasMany(() => WorkshopProgressReport) declare progressReports?: WorkshopProgressReport[];
}
