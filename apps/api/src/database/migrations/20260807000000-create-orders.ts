import { DataTypes } from 'sequelize';
import type { DatabaseMigration } from '../migration.types';

const reference = (model: string, allowNull = false) => ({ type: DataTypes.BIGINT.UNSIGNED, allowNull, references: { model, key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' });

export const up: DatabaseMigration['up'] = async ({ context }) => {
  await context.sequelize.transaction(async (transaction) => {
    await context.createTable('orders', {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true, allowNull: false },
      code: { type: DataTypes.STRING(30), allowNull: false, unique: true },
      sale_id: { ...reference('sales'), unique: true },
      customer_id: reference('customers'),
      status: { type: DataTypes.ENUM('OPEN', 'IN_PROGRESS', 'READY', 'COMPLETED', 'CANCELLED'), allowNull: false, defaultValue: 'OPEN' },
      promised_date: DataTypes.DATEONLY,
      notes: DataTypes.TEXT,
      created_by_user_id: reference('users'),
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false }
    }, { transaction });
    await context.createTable('order_items', {
      id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true, allowNull: false },
      order_id: reference('orders'),
      sale_item_id: { ...reference('sale_items'), unique: true },
      product_id: reference('products'),
      product_variant_id: reference('product_variants', true),
      product_name_snapshot: { type: DataTypes.STRING(180), allowNull: false },
      variant_name_snapshot: DataTypes.STRING(180),
      sku_snapshot: DataTypes.STRING(100),
      customization: DataTypes.JSON,
      quantity: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      supply_type: { type: DataTypes.ENUM('IN_STOCK', 'MADE_TO_ORDER'), allowNull: false },
      status: { type: DataTypes.ENUM('RESERVED', 'PENDING_PRODUCTION', 'IN_PRODUCTION', 'READY', 'DELIVERED', 'CANCELLED'), allowNull: false },
      notes: DataTypes.TEXT,
      created_at: { type: DataTypes.DATE, allowNull: false },
      updated_at: { type: DataTypes.DATE, allowNull: false }
    }, { transaction });
    await context.addIndex('orders', ['customer_id', 'status'], { transaction });
    await context.addIndex('orders', ['status', 'created_at'], { transaction });
    await context.addIndex('order_items', ['order_id'], { transaction });
    await context.addIndex('order_items', ['product_variant_id'], { transaction });
    await context.sequelize.query('ALTER TABLE order_items ADD CONSTRAINT chk_order_items_quantity CHECK (quantity > 0)', { transaction });
  });
};
export const down: DatabaseMigration['down'] = async ({ context }) => {
  await context.sequelize.transaction(async (transaction) => {
    await context.dropTable('order_items', { transaction });
    await context.dropTable('orders', { transaction });
  });
};
