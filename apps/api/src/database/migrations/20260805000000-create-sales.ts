import { DataTypes } from 'sequelize';
import type { DatabaseMigration } from '../migration.types';
const id = {
  type: DataTypes.BIGINT.UNSIGNED,
  autoIncrement: true,
  primaryKey: true,
  allowNull: false
};
const timestamps = {
  created_at: { type: DataTypes.DATE, allowNull: false },
  updated_at: { type: DataTypes.DATE, allowNull: false }
};
const reference = (model: string, nullable = false) => ({
  type: DataTypes.BIGINT.UNSIGNED,
  allowNull: !nullable,
  references: { model, key: 'id' },
  onUpdate: 'CASCADE',
  onDelete: 'RESTRICT'
});
const requiredReference = (model: string) => ({ ...reference(model, true), allowNull: false });
const user = requiredReference('users');
export const up: DatabaseMigration['up'] = async ({ context }) => {
  await context.sequelize.transaction(async (transaction) => {
    await context.createTable(
      'sales',
      {
        id,
        code: { type: DataTypes.STRING(30), allowNull: false, unique: true },
        customer_id: requiredReference('customers'),
        quote_id: { ...reference('quotes'), unique: true },
        status: {
          type: DataTypes.ENUM('CONFIRMED', 'CANCELLED'),
          allowNull: false,
          defaultValue: 'CONFIRMED'
        },
        subtotal: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
        discount_total: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
        delivery_fee: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
        total: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
        notes: DataTypes.TEXT,
        created_by_user_id: user,
        cancelled_by_user_id: reference('users'),
        cancelled_at: DataTypes.DATE,
        cancellation_reason: DataTypes.TEXT,
        ...timestamps
      },
      { transaction }
    );
    await context.createTable(
      'sale_items',
      {
        id,
        sale_id: requiredReference('sales'),
        product_id: requiredReference('products'),
        product_variant_id: reference('product_variants'),
        product_name_snapshot: { type: DataTypes.STRING(180), allowNull: false },
        variant_name_snapshot: DataTypes.STRING(180),
        sku_snapshot: DataTypes.STRING(100),
        customization: DataTypes.JSON,
        quantity: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
        unit_list_price: DataTypes.DECIMAL(12, 2),
        unit_sale_price: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
        unit_cost_snapshot: DataTypes.DECIMAL(12, 2),
        discount_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
        subtotal: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
        negotiation_reason: DataTypes.TEXT,
        is_below_cost: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        below_cost_reason: DataTypes.TEXT,
        notes: DataTypes.TEXT,
        ...timestamps
      },
      { transaction }
    );
    await context.addIndex('sales', ['customer_id', 'status'], { transaction });
    await context.addIndex('sales', ['status', 'created_at'], { transaction });
    await context.addIndex('sale_items', ['sale_id'], { transaction });
    await context.addIndex('sale_items', ['product_id'], { transaction });
    await context.sequelize.query(
      'ALTER TABLE sales ADD CONSTRAINT chk_sales_delivery_fee CHECK (delivery_fee >= 0)',
      { transaction }
    );
    await context.sequelize.query(
      'ALTER TABLE sale_items ADD CONSTRAINT chk_sale_items_quantity CHECK (quantity > 0), ADD CONSTRAINT chk_sale_items_price CHECK (unit_sale_price > 0)',
      { transaction }
    );
  });
};
export const down: DatabaseMigration['down'] = async ({ context }) => {
  await context.sequelize.transaction(async (transaction) => {
    await context.dropTable('sale_items', { transaction });
    await context.dropTable('sales', { transaction });
  });
};
