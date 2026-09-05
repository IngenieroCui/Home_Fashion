import { Column, DataType, HasMany, Model, Table } from 'sequelize-typescript';
import { User } from './user.model';
@Table({ tableName: 'roles', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' }) export class Role extends Model { @Column({ type: DataType.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true }) declare id: string; @Column({ type: DataType.STRING(40), unique: true, allowNull: false }) declare code: string; @Column({ type: DataType.STRING(100), allowNull: false }) declare name: string; @HasMany(() => User) declare users?: User[]; }
