import { BelongsTo, Column, DataType, ForeignKey, Model, Table } from 'sequelize-typescript';
import { Product } from '../../catalog/entities/product.model';
import { ProductVariant } from '../../catalog/entities/product-variant.model';
import { Sale } from './sale.model';

@Table({
  tableName: 'sale_items',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
})
export class SaleItem extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true })
  declare id: string;
  @ForeignKey(() => Sale)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false, field: 'sale_id' })
  declare saleId: string;
  @ForeignKey(() => Product)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false, field: 'product_id' })
  declare productId: string;
  @ForeignKey(() => ProductVariant)
  @Column({ type: DataType.BIGINT.UNSIGNED, field: 'product_variant_id' })
  declare productVariantId: string | null;
  @Column({ type: DataType.STRING(180), allowNull: false, field: 'product_name_snapshot' })
  declare productNameSnapshot: string;
  @Column({ type: DataType.STRING(180), field: 'variant_name_snapshot' })
  declare variantNameSnapshot: string | null;
  @Column({ type: DataType.STRING(100), field: 'sku_snapshot' }) declare skuSnapshot: string | null;
  @Column(DataType.JSON) declare customization: Record<string, unknown> | null;
  @Column({ type: DataType.INTEGER.UNSIGNED, allowNull: false }) declare quantity: number;
  @Column({ type: DataType.DECIMAL(12, 2), field: 'unit_list_price' }) declare unitListPrice:
    string | null;
  @Column({ type: DataType.DECIMAL(12, 2), allowNull: false, field: 'unit_sale_price' })
  declare unitSalePrice: string;
  @Column({ type: DataType.DECIMAL(12, 2), field: 'unit_cost_snapshot' }) declare unitCostSnapshot:
    string | null;
  @Column({ type: DataType.DECIMAL(12, 2), allowNull: false, field: 'discount_amount' })
  declare discountAmount: string;
  @Column({ type: DataType.DECIMAL(12, 2), allowNull: false }) declare subtotal: string;
  @Column({ type: DataType.TEXT, field: 'negotiation_reason' }) declare negotiationReason:
    string | null;
  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_below_cost' })
  declare isBelowCost: boolean;
  @Column({ type: DataType.TEXT, field: 'below_cost_reason' }) declare belowCostReason:
    string | null;
  @Column(DataType.TEXT) declare notes: string | null;
  @BelongsTo(() => Sale) declare sale?: Sale;
  @BelongsTo(() => Product) declare product?: Product;
  @BelongsTo(() => ProductVariant) declare productVariant?: ProductVariant;
}
