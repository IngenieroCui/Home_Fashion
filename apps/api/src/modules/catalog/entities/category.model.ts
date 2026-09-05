import { Column, DataType, HasMany, Model, Table } from 'sequelize-typescript';
import { Product } from './product.model';

@Table({ tableName: 'categories', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' })
export class Category extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true })
  declare id: string;

  @Column({ type: DataType.STRING(120), allowNull: false })
  declare name: string;

  @Column({ type: DataType.STRING(140), allowNull: false, unique: true })
  declare slug: string;

  @Column(DataType.TEXT)
  declare description: string | null;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  declare isActive: boolean;

  @HasMany(() => Product)
  declare products?: Product[];
}
