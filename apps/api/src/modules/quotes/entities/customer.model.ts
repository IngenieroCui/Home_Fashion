import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript';
import { User } from '../../auth/entities/user.model'; import { CustomerDocumentType } from '../quotes.types';
@Table({ tableName: 'customers', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' })
export class Customer extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true }) declare id: string;
  @Column({ type: DataType.STRING(180), allowNull: false, field: 'full_name' }) declare fullName: string;
  @Column(DataType.ENUM(...Object.values(CustomerDocumentType))) declare documentType: CustomerDocumentType | null;
  @Column({ type: DataType.STRING(80), unique: true, field: 'document_number' }) declare documentNumber: string | null;
  @Column({ type: DataType.STRING(60), allowNull: false }) declare phone: string;
  @Column(DataType.STRING(254)) declare email: string | null; @Column(DataType.STRING(120)) declare city: string | null;
  @Column(DataType.STRING(120)) declare neighborhood: string | null; @Column(DataType.STRING(255)) declare address: string | null; @Column(DataType.TEXT) declare notes: string | null;
  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true, field: 'is_active' }) declare isActive: boolean;
  @ForeignKey(() => User) @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: true, field: 'created_by_user_id' }) declare createdByUserId: string | null;
  @ForeignKey(() => User) @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: true, field: 'updated_by_user_id' }) declare updatedByUserId: string | null;
  @BelongsTo(() => User, 'createdByUserId') declare createdByUser?: User; @BelongsTo(() => User, 'updatedByUserId') declare updatedByUser?: User;
}
