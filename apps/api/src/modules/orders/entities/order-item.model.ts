import { BelongsTo, Column, DataType, ForeignKey, HasOne, Model, Table } from 'sequelize-typescript';
import { Product } from '../../catalog/entities/product.model';
import { ProductVariant } from '../../catalog/entities/product-variant.model';
import { SaleItem } from '../../sales/entities/sale-item.model';
import { OrderItemStatus, OrderSupplyType } from '../orders.types';
import { Order } from './order.model';
import { WorkshopJob } from '../../workshop-jobs/entities/workshop-job.model';

@Table({ tableName: 'order_items', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' })
export class OrderItem extends Model {
  @Column({ type: DataType.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true }) declare id: string;
  @ForeignKey(() => Order)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false, field: 'order_id' }) declare orderId: string;
  @ForeignKey(() => SaleItem)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false, unique: true, field: 'sale_item_id' }) declare saleItemId: string;
  @ForeignKey(() => Product)
  @Column({ type: DataType.BIGINT.UNSIGNED, allowNull: false, field: 'product_id' }) declare productId: string;
  @ForeignKey(() => ProductVariant)
  @Column({ type: DataType.BIGINT.UNSIGNED, field: 'product_variant_id' }) declare productVariantId: string | null;
  @Column({ type: DataType.STRING(180), allowNull: false, field: 'product_name_snapshot' }) declare productNameSnapshot: string;
  @Column({ type: DataType.STRING(180), field: 'variant_name_snapshot' }) declare variantNameSnapshot: string | null;
  @Column({ type: DataType.STRING(100), field: 'sku_snapshot' }) declare skuSnapshot: string | null;
  @Column({ type: DataType.STRING(2048), field: 'image_url_snapshot' }) declare imageUrlSnapshot: string | null;
  @Column(DataType.JSON) declare customization: Record<string, unknown> | null;
  @Column({ type: DataType.INTEGER.UNSIGNED, allowNull: false }) declare quantity: number;
  @Column({ type: DataType.ENUM(...Object.values(OrderSupplyType)), allowNull: false, field: 'supply_type' }) declare supplyType: OrderSupplyType;
  @Column({ type: DataType.ENUM(...Object.values(OrderItemStatus)), allowNull: false }) declare status: OrderItemStatus;
  @Column(DataType.TEXT) declare notes: string | null;
  @BelongsTo(() => Order) declare order?: Order;
  @BelongsTo(() => SaleItem) declare saleItem?: SaleItem;
  @BelongsTo(() => Product) declare product?: Product;
  @BelongsTo(() => ProductVariant) declare productVariant?: ProductVariant;
  @HasOne(() => WorkshopJob) declare workshopJob?: WorkshopJob;
}
