import { BelongsTo, Column, DataType, ForeignKey, HasMany, Model, Table } from 'sequelize-typescript';
import { CatalogStatus } from '../catalog.types';
import { Category } from './category.model';
import { ProductImage } from './product-image.model';
import { ProductVariant } from './product-variant.model';

@Table({ tableName: 'products', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' })
export class Product extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true })
  declare id: string;

  @ForeignKey(() => Category)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false, field: 'category_id' })
  declare categoryId: string;

  @Column({ type: DataType.STRING(180), allowNull: false })
  declare name: string;

  @Column({ type: DataType.STRING(200), allowNull: false, unique: true })
  declare slug: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  declare description: string;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false, field: 'allows_customization' })
  declare allowsCustomization: boolean;

  @Column({ type: DataType.ENUM(...Object.values(CatalogStatus)), allowNull: false, defaultValue: CatalogStatus.ACTIVE })
  declare status: CatalogStatus;

  @BelongsTo(() => Category)
  declare category?: Category;

  @HasMany(() => ProductVariant)
  declare variants?: ProductVariant[];

  @HasMany(() => ProductImage)
  declare images?: ProductImage[];
}
