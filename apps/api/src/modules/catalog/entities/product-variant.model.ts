import { BelongsTo, Column, DataType, ForeignKey, HasMany, Model, Table } from 'sequelize-typescript';
import { CatalogStatus } from '../catalog.types';
import { ProductImage } from './product-image.model';
import { Product } from './product.model';

@Table({ tableName: 'product_variants', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' })
export class ProductVariant extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true })
  declare id: string;

  @ForeignKey(() => Product)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false, field: 'product_id' })
  declare productId: string;

  @Column({ type: DataType.STRING(100), allowNull: false, unique: true })
  declare sku: string;

  @Column(DataType.STRING(180)) declare name: string | null;
  @Column(DataType.STRING(160)) declare dimensions: string | null;
  @Column(DataType.STRING(160)) declare material: string | null;
  @Column(DataType.STRING(100)) declare color: string | null;
  @Column(DataType.STRING(120)) declare fabric: string | null;
  @Column(DataType.STRING(120)) declare finish: string | null;

  @Column({ type: DataType.DECIMAL(12, 2), allowNull: false, field: 'sale_price', validate: { min: 0.01 } })
  declare salePrice: string;

  @Column({ type: DataType.DECIMAL(12, 2), field: 'estimated_cost' })
  declare estimatedCost: string | null;

  @Column({ type: DataType.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0, field: 'quantity_on_hand' })
  declare quantityOnHand: number;

  @Column({ type: DataType.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0, field: 'quantity_reserved', validate: { isNotGreaterThanOnHand(this: ProductVariant, value: number) { if (value > this.quantityOnHand) throw new Error('quantityReserved cannot exceed quantityOnHand'); } } })
  declare quantityReserved: number;

  @Column(DataType.STRING(180)) declare location: string | null;

  @Column({ type: DataType.ENUM(...Object.values(CatalogStatus)), allowNull: false, defaultValue: CatalogStatus.ACTIVE })
  declare status: CatalogStatus;

  @BelongsTo(() => Product) declare product?: Product;
  @HasMany(() => ProductImage) declare images?: ProductImage[];
}
