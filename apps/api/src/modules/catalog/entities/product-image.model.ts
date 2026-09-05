import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript';
import { Product } from './product.model';
import { ProductVariant } from './product-variant.model';

@Table({ tableName: 'product_images', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' })
export class ProductImage extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true })
  declare id: string;

  @ForeignKey(() => Product)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false, field: 'product_id' })
  declare productId: string;

  @ForeignKey(() => ProductVariant)
  @Column({ type: DataType.BIGINT.UNSIGNED, field: 'product_variant_id' })
  declare productVariantId: string | null;

  @Column({ type: DataType.STRING(2048), allowNull: false }) declare url: string;
  @Column({ type: DataType.STRING(255), field: 'public_id' }) declare publicId: string | null;
  @Column({ type: DataType.STRING(255), field: 'alt_text' }) declare altText: string | null;
  @Column({ type: DataType.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 }) declare position: number;
  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_primary' }) declare isPrimary: boolean;

  @BelongsTo(() => Product) declare product?: Product;
  @BelongsTo(() => ProductVariant) declare productVariant?: ProductVariant;
}
